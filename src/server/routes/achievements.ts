import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { visiblePeersCte } from "../utils/visible-peers";

const achievements = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

achievements.use("*", authMiddleware);

interface Badge {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly earned: boolean;
  readonly progress?: string;
}

achievements.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;
  const mid = payload.member_id;

  const [reviewsResult, restaurantsResult, scoresResult, cuisinesResult] = await db.batch([
    db.prepare("SELECT COUNT(*) as count FROM reviews WHERE member_id = ?").bind(mid),
    db.prepare("SELECT COUNT(*) as count FROM restaurants WHERE created_by = ?").bind(mid),
    db.prepare(
      "SELECT overall_score, COUNT(*) as count FROM reviews WHERE member_id = ? GROUP BY overall_score"
    ).bind(mid),
    db.prepare(
      `${visiblePeersCte()}
       SELECT COUNT(DISTINCT r.cuisine) as count
       FROM restaurants r
       JOIN reviews rv ON rv.restaurant_id = r.id
       WHERE rv.member_id = ? AND r.cuisine IS NOT NULL AND r.cuisine != ''
         AND r.created_by IN (SELECT member_id FROM visible_peers)`
    ).bind(mid, mid, mid),
  ]);

  const reviewCount = (reviewsResult?.results[0] as { count: number } | undefined)?.count ?? 0;
  const restaurantCount = (restaurantsResult?.results[0] as { count: number } | undefined)?.count ?? 0;
  const scores = (scoresResult?.results ?? []) as Array<{ overall_score: number; count: number }>;
  const cuisineCount = (cuisinesResult?.results[0] as { count: number } | undefined)?.count ?? 0;

  const perfectCount = scores.find((s) => s.overall_score === 10)?.count ?? 0;
  const harshCount = scores.filter((s) => s.overall_score <= 3).reduce((sum, s) => sum + s.count, 0);

  const badges: Badge[] = [
    {
      id: "first_review",
      name: "First Bite",
      description: "Write your first review",
      icon: "🍽️",
      earned: reviewCount >= 1,
    },
    {
      id: "five_reviews",
      name: "Regular",
      description: "Write 5 reviews",
      icon: "📝",
      earned: reviewCount >= 5,
      progress: `${Math.min(reviewCount, 5)}/5`,
    },
    {
      id: "twenty_reviews",
      name: "Food Critic",
      description: "Write 20 reviews",
      icon: "🎓",
      earned: reviewCount >= 20,
      progress: `${Math.min(reviewCount, 20)}/20`,
    },
    {
      id: "fifty_reviews",
      name: "Michelin Inspector",
      description: "Write 50 reviews",
      icon: "⭐",
      earned: reviewCount >= 50,
      progress: `${Math.min(reviewCount, 50)}/50`,
    },
    {
      id: "first_restaurant",
      name: "Trailblazer",
      description: "Add your first restaurant",
      icon: "🗺️",
      earned: restaurantCount >= 1,
    },
    {
      id: "ten_restaurants",
      name: "Explorer",
      description: "Add 10 restaurants",
      icon: "🧭",
      earned: restaurantCount >= 10,
      progress: `${Math.min(restaurantCount, 10)}/10`,
    },
    {
      id: "perfect_ten",
      name: "Perfect 10",
      description: "Give a restaurant a perfect score",
      icon: "💯",
      earned: perfectCount >= 1,
    },
    {
      id: "tough_crowd",
      name: "Tough Crowd",
      description: "Give 3 or lower on 3 reviews",
      icon: "😤",
      earned: harshCount >= 3,
      progress: `${Math.min(harshCount, 3)}/3`,
    },
    {
      id: "five_cuisines",
      name: "World Traveler",
      description: "Review 5 different cuisines",
      icon: "🌍",
      earned: cuisineCount >= 5,
      progress: `${Math.min(cuisineCount, 5)}/5`,
    },
    {
      id: "ten_cuisines",
      name: "Globe Trotter",
      description: "Review 10 different cuisines",
      icon: "✈️",
      earned: cuisineCount >= 10,
      progress: `${Math.min(cuisineCount, 10)}/10`,
    },
  ];

  return c.json({
    data: {
      badges,
      earned_count: badges.filter((b) => b.earned).length,
      total_count: badges.length,
    },
  });
});

export { achievements as achievementRoutes };
