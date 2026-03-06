-- Normalize freeform cuisine values into the standard CUISINES list
UPDATE restaurants SET cuisine = CASE
  -- American
  WHEN cuisine IN (
    'American - bfast', 'American B''fast/Lunch', 'American b''fast/lunch',
    'American/brunch', 'BLT', 'Bar Food', 'Breakfast', 'Brunch',
    'Burger', 'Burger - Fish & Chips', 'Burgers', 'Burgers and more',
    'Burgers&fries', 'Burgers, etc.', 'Diner', 'Diner - b''fast',
    'Dinner and Dessert Pie', 'Fried Chicken', 'Hot Dogs',
    'Irish pub and grill', 'Prime Rib', 'Prime meats', 'Prime rib',
    'Pub', 'Pub Food', 'Pub and Pizza', 'Pub food', 'Pub/brunch',
    'Sandwiches', 'Sports', 'Sports Bar',
    'Steak', 'Steakhouse', 'Steaks',
    'Upscale American', 'Upscale Bar'
  ) THEN 'American'

  -- Asian Fusion
  WHEN cuisine IN (
    'Asian', 'Asian Fusin', 'Asian Variety',
    'Korean/Latin Fusion', 'SE Asian hawker stalls', 'Singapore/French'
  ) THEN 'Asian Fusion'

  -- Bakery/Cafe
  WHEN cuisine IN (
    'Baked Goods', 'Bakery', 'Coffee', 'Danish Bakery',
    'European bakery', 'Georgian Bakery', 'Pastry'
  ) THEN 'Bakery/Cafe'

  -- Barbecue
  WHEN cuisine IN ('BBQ', 'Grilled Meats', 'Texas BarBQue') THEN 'Barbecue'

  -- Chinese
  WHEN cuisine IN ('Chinese Szechuan', 'Dim Sum', 'Dumplings', 'Hot pot', 'Shrimp Toast') THEN 'Chinese'

  -- Deli
  WHEN cuisine = 'Deli' THEN 'Deli'

  -- Dessert
  WHEN cuisine = 'I''ve Cream' THEN 'Dessert'

  -- French
  WHEN cuisine = 'French/steak' THEN 'French'

  -- Italian
  WHEN cuisine = 'Italian Sando''s' THEN 'Italian'

  -- Japanese
  WHEN cuisine IN ('Ramen', 'Sushi', 'Tempura', 'Teriaki', 'Teriyaki') THEN 'Japanese'

  -- Korean
  WHEN cuisine IN ('Korean BBQ', 'Korean Burritos', 'Korean Chicken', 'Korean chicken') THEN 'Korean'

  -- Mediterranean
  WHEN cuisine = 'Spanish - Tapas' THEN 'Mediterranean'

  -- Mexican
  WHEN cuisine IN ('Latin American', 'Mexican Chocolate', 'Southwest', 'Upscale Tacos') THEN 'Mexican'

  -- Middle Eastern
  WHEN cuisine IN ('Moroccan', 'Persian') THEN 'Middle Eastern'

  -- Pizza
  WHEN cuisine IN ('Detroit Pizza', 'Detroit pizza') THEN 'Pizza'

  -- Seafood
  WHEN cuisine IN ('Fish', 'Fish &  chips', 'Seafood & beef', 'Seafood and more', 'Seafood and other') THEN 'Seafood'

  -- Southern
  WHEN cuisine = 'Southern/fusion' THEN 'Southern'

  -- Vietnamese
  WHEN cuisine = 'Pho' THEN 'Vietnamese'

  -- Other
  WHEN cuisine IN (
    'Buffet', 'Craft Brewery', 'Family', 'Fine Dining',
    'Hungarian', 'Peruvian', 'Road Trip Ets', 'Russian Dumplings',
    'Upscale', 'Variety and inexpensive'
  ) THEN 'Other'

  -- Keep already-valid values and nulls as-is
  ELSE cuisine
END
WHERE cuisine NOT IN (
  'American', 'Asian Fusion', 'Bakery/Cafe', 'Barbecue', 'Brazilian',
  'Chinese', 'Deli', 'Dessert', 'French', 'Greek', 'Indian', 'Italian',
  'Japanese', 'Korean', 'Mediterranean', 'Mexican', 'Middle Eastern',
  'Pizza', 'Seafood', 'Southern', 'Thai', 'Vietnamese', 'Other'
) OR cuisine IS NULL;
