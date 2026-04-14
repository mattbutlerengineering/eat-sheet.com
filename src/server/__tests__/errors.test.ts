import { describe, it, expect } from "vitest";
import {
  DomainError,
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "../errors";

describe("DomainError", () => {
  it("defaults to statusCode 500", () => {
    const err = new DomainError("Something went wrong");
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe("Something went wrong");
    expect(err).toBeInstanceOf(Error);
  });

  it("accepts a custom statusCode", () => {
    const err = new DomainError("Custom error", 418);
    expect(err.statusCode).toBe(418);
  });

  it("sets name to the class name", () => {
    const err = new DomainError("test");
    expect(err.name).toBe("DomainError");
  });
});

describe("NotFoundError", () => {
  it("has statusCode 404", () => {
    const err = new NotFoundError("Resource not found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Resource not found");
  });

  it("is instanceof DomainError", () => {
    const err = new NotFoundError("not found");
    expect(err).toBeInstanceOf(DomainError);
  });

  it("is instanceof Error", () => {
    const err = new NotFoundError("not found");
    expect(err).toBeInstanceOf(Error);
  });

  it("has name set to NotFoundError", () => {
    const err = new NotFoundError("not found");
    expect(err.name).toBe("NotFoundError");
  });
});

describe("ValidationError", () => {
  it("has statusCode 400", () => {
    const err = new ValidationError("Invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Invalid input");
  });

  it("is instanceof DomainError", () => {
    const err = new ValidationError("bad");
    expect(err).toBeInstanceOf(DomainError);
  });

  it("has name set to ValidationError", () => {
    const err = new ValidationError("bad");
    expect(err.name).toBe("ValidationError");
  });
});

describe("ConflictError", () => {
  it("has statusCode 409", () => {
    const err = new ConflictError("Already exists");
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Already exists");
  });

  it("is instanceof DomainError", () => {
    const err = new ConflictError("conflict");
    expect(err).toBeInstanceOf(DomainError);
  });

  it("has name set to ConflictError", () => {
    const err = new ConflictError("conflict");
    expect(err.name).toBe("ConflictError");
  });
});

describe("ForbiddenError", () => {
  it("has statusCode 403", () => {
    const err = new ForbiddenError("Access denied");
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Access denied");
  });

  it("is instanceof DomainError", () => {
    const err = new ForbiddenError("forbidden");
    expect(err).toBeInstanceOf(DomainError);
  });

  it("has name set to ForbiddenError", () => {
    const err = new ForbiddenError("forbidden");
    expect(err.name).toBe("ForbiddenError");
  });
});
