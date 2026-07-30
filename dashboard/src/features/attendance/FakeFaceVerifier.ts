// Fake Face ID verifier — BLOCKED(face-recognition), PLAN_tabel-davomat.md
// §0. There is no real camera / liveness detection; this simulates the
// "scanning" ritual with a delay (same theatre as `FakeEriSigner`) and
// resolves with a self-reported `confirmed: true`. The backend never treats
// this as verified biometrics — it records `face_status = 'SELF_CONFIRMED'`
// ("the employee pressed the button on their device"), not `'VERIFIED'`
// (reserved for a future real camera integration). The frontend sends no
// special parameter for this — the server sets `face_status` on its own.

export interface FakeFaceVerifyResult {
  confirmed: true;
}

export const FakeFaceVerifier = {
  /** Simulated on-device face scan (~1.5 s), always "succeeds" (self-report only). */
  async verify(): Promise<FakeFaceVerifyResult> {
    await new Promise((r) => setTimeout(r, 1500));
    return { confirmed: true };
  },
};
