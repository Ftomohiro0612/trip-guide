import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "./visit-place-coordinates.ts";
const { isMissingVisitCoordinateColumnError } = await import(modulePath);

test("detects an unapplied visit coordinate migration", () => {
  assert.equal(
    isMissingVisitCoordinateColumnError({
      code: "PGRST204",
      message: "Could not find the 'place_latitude' column of 'visits'",
    }),
    true,
  );
  assert.equal(
    isMissingVisitCoordinateColumnError({
      code: "42703",
      message: 'column visits.place_longitude does not exist',
    }),
    true,
  );
});

test("does not hide unrelated visit write errors", () => {
  assert.equal(
    isMissingVisitCoordinateColumnError({
      code: "42501",
      message: "new row violates row-level security policy for table visits",
    }),
    false,
  );
  assert.equal(
    isMissingVisitCoordinateColumnError({
      code: "PGRST204",
      message: "Could not find the 'status' column of 'visits'",
    }),
    false,
  );
});
