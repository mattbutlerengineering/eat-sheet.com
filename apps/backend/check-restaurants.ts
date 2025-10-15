import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

try {
  const restaurants = await sql`
    SELECT id, name, slug, created_at
    FROM restaurants
    ORDER BY created_at DESC
    LIMIT 10
  `;

  console.log(`Found ${restaurants.length} restaurant(s):`);
  console.log(JSON.stringify(restaurants, null, 2));

  await sql.end();
} catch (error) {
  console.error('Error querying database:', error);
  process.exit(1);
}