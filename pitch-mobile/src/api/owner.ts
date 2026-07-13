import { apiClient } from "./client";
import type {
  Ground,
  ManagerAssignment,
  OwnerAnalytics,
  CreateGroundRequest,
  AssignManagerRequest,
} from "./types";

export async function getOwnerGrounds(): Promise<Ground[]> {
  const { data } = await apiClient.get<{ data: Ground[] }>("/owner/grounds");
  return data.data;
}

export async function createGround(
  payload: CreateGroundRequest,
): Promise<Ground> {
  const { data } = await apiClient.post<{ data: Ground }>(
    "/owner/grounds",
    payload,
  );
  return data.data;
}

export async function createGroundWithPhotos(
  payload: CreateGroundRequest,
  photoUris: string[],
): Promise<Ground> {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      );
    }
  });
  photoUris.forEach((uri, idx) => {
    const filename = uri.split("/").pop() ?? `photo_${idx}.jpg`;
    const ext = filename.split(".").pop() ?? "jpg";
    formData.append("photos", {
      uri,
      name: filename,
      type: `image/${ext}`,
    } as unknown as Blob);
  });
  const { data } = await apiClient.post<{ data: Ground }>(
    "/owner/grounds",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data.data;
}

export async function updateGround(
  id: string,
  updates: Partial<CreateGroundRequest> & { is_active?: boolean },
): Promise<Ground> {
  const { data } = await apiClient.patch<{ data: Ground }>(
    `/owner/grounds/${id}`,
    updates,
  );
  return data.data;
}

export async function getGroundManagers(
  groundId: string,
): Promise<ManagerAssignment[]> {
  const { data } = await apiClient.get<{ data: ManagerAssignment[] }>(
    `/owner/grounds/${groundId}/managers`,
  );
  return data.data;
}

export async function assignManager(
  groundId: string,
  payload: AssignManagerRequest,
): Promise<ManagerAssignment> {
  const { data } = await apiClient.post<{ data: ManagerAssignment }>(
    `/owner/grounds/${groundId}/managers`,
    payload,
  );
  return data.data;
}

export async function removeManager(
  groundId: string,
  managerId: string,
): Promise<void> {
  await apiClient.delete(`/owner/grounds/${groundId}/managers/${managerId}`);
}

export async function getOwnerAnalytics(params: {
  period: "today" | "week" | "month";
  ground_id?: string;
}): Promise<OwnerAnalytics> {
  const { data } = await apiClient.get<{ data: OwnerAnalytics }>(
    "/owner/analytics",
    { params },
  );
  return data.data;
}
