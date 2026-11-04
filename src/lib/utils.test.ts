import { describe, test, expect } from "vitest"
import { cn } from "./utils"

describe("cn utility", () => {
  test("merges class lists correctly", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white")
  })

  test("handles conditional classes", () => {
    expect(cn("bg-red-500", false && "text-white", true && "font-bold")).toBe("bg-red-500 font-bold")
  })

  test("resolves tailwind conflicts", () => {
    expect(cn("p-4", "p-6")).toBe("p-6")
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })
})
