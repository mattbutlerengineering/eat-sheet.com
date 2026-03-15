import type { Page } from "@playwright/test";
import {
  TEST_MEMBER,
  TEST_RESTAURANTS,
  TEST_RESTAURANT_DETAIL,
  TEST_ACTIVITY,
  TEST_STATS,
  TEST_BOOKMARKS,
} from "../helpers/test-data";

function json(data: unknown) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data }),
  };
}

export async function mockApi(page: Page, overrides?: Partial<MockOverrides>) {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill(json({ ...TEST_MEMBER, groups: [] })),
  );

  await page.route("**/api/restaurants", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill(json(overrides?.restaurants ?? TEST_RESTAURANTS));
    }
    return route.fulfill(json({ id: "rest-new", name: "New Restaurant" }));
  });

  await page.route("**/api/restaurants/*", (route) => {
    if (route.request().method() === "DELETE") {
      return route.fulfill(json(null));
    }
    return route.fulfill(json(overrides?.restaurantDetail ?? TEST_RESTAURANT_DETAIL));
  });

  await page.route("**/api/reviews/*", (route) =>
    route.fulfill(json({ id: "rev-new" })),
  );

  await page.route("**/api/activity", (route) =>
    route.fulfill(json(overrides?.activity ?? TEST_ACTIVITY)),
  );

  await page.route("**/api/stats", (route) =>
    route.fulfill(json(overrides?.stats ?? TEST_STATS)),
  );

  await page.route("**/api/bookmarks", (route) =>
    route.fulfill(json(overrides?.bookmarks ?? TEST_BOOKMARKS)),
  );

  await page.route("**/api/bookmarks/*", (route) =>
    route.fulfill(json(null)),
  );

  await page.route("**/api/reactions/*", (route) =>
    route.fulfill(json(null)),
  );

  await page.route("**/api/places/autocomplete", (route) =>
    route.fulfill(
      json(overrides?.placeSuggestions ?? [
        { place_id: "place-1", name: "Test Place", address: "100 Test St" },
      ]),
    ),
  );

  await page.route("**/api/groups**", (route) =>
    route.fulfill(json(overrides?.groups ?? [])),
  );

  await page.route("**/api/tonight*", (route) =>
    route.fulfill(json([])),
  );

  await page.route("**/api/recommendations*", (route) =>
    route.fulfill(json({
      bookmarked: [],
      revisit: [],
      needs_opinions: [],
      new_cuisines: [],
    })),
  );
}

interface MockOverrides {
  readonly restaurants: readonly unknown[];
  readonly restaurantDetail: unknown;
  readonly activity: readonly unknown[];
  readonly stats: unknown;
  readonly bookmarks: readonly unknown[];
  readonly placeSuggestions: readonly unknown[];
  readonly groups: readonly unknown[];
}
