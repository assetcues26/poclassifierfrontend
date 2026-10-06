import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getJob, login, logout } from "./client.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockFetch(response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("api client", () => {
  it("login posts credentials with cookies included", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: async () => ({ ok: true, username: "testuser" }),
    });

    const body = await login("testuser", "testpass");
    expect(body.username).toBe("testuser");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/login");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(options.body)).toEqual({
      username: "testuser",
      password: "testpass",
    });
  });

  it("login retries once after a timeout", async () => {
    const abortErr = new DOMException("Aborted", "AbortError");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(abortErr)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, username: "testuser" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const body = await login("testuser", "testpass");
    expect(body.username).toBe("testuser");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("raises ApiError with detail from JSON body", async () => {
    mockFetch({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ detail: "Not authenticated" }),
    });

    try {
      await getJob("abc");
      expect.fail("expected ApiError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.message).toBe("Not authenticated");
      expect(err.status).toBe(401);
    }
  });

  it("logout posts to /api/logout", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: async () => ({ ok: true }),
    });
    await logout();
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/logout");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });
});
