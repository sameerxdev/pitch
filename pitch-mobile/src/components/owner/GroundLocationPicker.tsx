import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import * as Location from "expo-location";
import {
  coordinateForCity,
  DEFAULT_MAP_COORDINATE,
  type MapCoordinate,
} from "@/constants/cityCoordinates";

type Props = {
  city: string;
  value: MapCoordinate | null;
  onChange: (coord: MapCoordinate) => void;
};

const DELTA = { latitudeDelta: 0.04, longitudeDelta: 0.04 };

function toRegion(coord: MapCoordinate): Region {
  return { ...coord, ...DELTA };
}

export function GroundLocationPicker({ city, value, onChange }: Props) {
  const mapRef = useRef<MapView>(null);
  const [locating, setLocating] = React.useState(false);

  const center = value ?? (city ? coordinateForCity(city) : DEFAULT_MAP_COORDINATE);

  useEffect(() => {
    if (!city || value) return;
    const next = coordinateForCity(city);
    mapRef.current?.animateToRegion(toRegion(next), 350);
  }, [city, value]);

  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coord = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      onChange(coord);
      mapRef.current?.animateToRegion(toRegion(coord), 350);
    } finally {
      setLocating(false);
    }
  }

  function handleMapPress(e: { nativeEvent: { coordinate: MapCoordinate } }) {
    onChange(e.nativeEvent.coordinate);
  }

  return (
    <View>
      <Text style={styles.hint}>
        Tap the map to place a pin where your ground is located.
      </Text>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={toRegion(center)}
          onPress={handleMapPress}
        >
          {value && <Marker coordinate={value} pinColor="#1A5C38" />}
        </MapView>
      </View>
      <TouchableOpacity
        onPress={handleUseCurrentLocation}
        disabled={locating}
        style={styles.locBtn}
      >
        {locating ? (
          <ActivityIndicator size="small" color="#1A5C38" />
        ) : (
          <Text style={styles.locBtnText}>📍 Use my current location</Text>
        )}
      </TouchableOpacity>
      {value && (
        <Text style={styles.coords}>
          {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: "#5A7264",
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
  },
  mapWrap: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E2EAE5",
  },
  map: { width: "100%", height: "100%" },
  locBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#E8F3EE",
  },
  locBtnText: { color: "#1A5C38", fontWeight: "600", fontSize: 13 },
  coords: {
    marginTop: 6,
    color: "#A0B4A8",
    fontSize: 11,
  },
});
