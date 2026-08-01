import { looksLikeHandoffCode, parseQuery } from "./socialAuth"

describe("social sign-in callback parsing", () => {
  it("reads the handoff code out of the app's redirect", () => {
    const code = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl-_x"
    expect(parseQuery(`companyos://auth/callback?code=${code}`)).toEqual({ code })
  })

  it("keeps a JWT intact — dots and base64url characters survive", () => {
    const code = "aa-bb_cc.dd-ee_ff.gg-hh_ii"
    expect(parseQuery(`companyos://auth/callback?code=${code}`).code).toBe(code)
    expect(looksLikeHandoffCode(code)).toBe(true)
  })

  it("surfaces the error param", () => {
    expect(parseQuery("companyos://auth/callback?error=sign_in_failed")).toEqual({
      error: "sign_in_failed",
    })
  })

  it("rejects a provider code mistaken for ours", () => {
    // Google's authorization codes look like `4/0AXEQ…` — one segment.
    expect(looksLikeHandoffCode("4/0AXEQxIDDiwsKuU8NITfPmmhiOm6")).toBe(false)
  })
})
