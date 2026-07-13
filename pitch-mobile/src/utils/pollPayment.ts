import { getPayment } from "@/api/payments";
import type { Payment } from "@/api/types";
import { Config } from "@/constants/config";

export async function pollPaymentUntilSettled(
  paymentId: string,
): Promise<Payment> {
  const deadline = Date.now() + Config.PAYMENT_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const payment = await getPayment(paymentId);
    if (payment.status !== "pending") return payment;
    await new Promise((r) => setTimeout(r, Config.PAYMENT_POLL_INTERVAL_MS));
  }
  throw new Error("Payment timed out. Please try again.");
}
