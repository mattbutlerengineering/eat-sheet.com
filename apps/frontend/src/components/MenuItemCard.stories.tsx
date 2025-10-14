import type { Meta, StoryObj } from '@storybook/react';
import MenuItemCard from './MenuItemCard';
import type { MenuItem } from '@/lib/types';

const meta: Meta<typeof MenuItemCard> = {
  title: 'Components/MenuItemCard',
  component: MenuItemCard,
  tags: ['autodocs'],
  argTypes: {
    item: {
      description: 'Menu item data to display',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MenuItemCard>;

// Base menu item data
const baseItem: MenuItem = {
  id: '1',
  menuId: 'menu-1',
  name: 'Margherita Pizza',
  description: 'Fresh mozzarella, tomato sauce, basil, and extra virgin olive oil on a crispy wood-fired crust',
  price: 1299, // $12.99
  section: 'Pizzas',
  imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
  status: 'available',
  displayOrder: 1,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export const Available: Story = {
  args: {
    item: baseItem,
  },
};

export const SoldOut: Story = {
  args: {
    item: {
      ...baseItem,
      name: 'Truffle Pasta',
      description: 'Handmade pasta with black truffle, parmesan, and butter sauce',
      price: 2499,
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
      status: 'sold_out',
    },
  },
};

export const NoImage: Story = {
  args: {
    item: {
      ...baseItem,
      name: 'Caesar Salad',
      description: 'Romaine lettuce, croutons, parmesan cheese, and homemade Caesar dressing',
      price: 899,
      imageUrl: null,
    },
  },
};

export const NoDescription: Story = {
  args: {
    item: {
      ...baseItem,
      name: 'Espresso',
      description: null,
      price: 350,
      imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400',
    },
  },
};

export const LongDescription: Story = {
  args: {
    item: {
      ...baseItem,
      name: 'Chef\'s Special Burger',
      description: 'A mouth-watering double patty burger with aged cheddar, crispy bacon, caramelized onions, fresh lettuce, tomatoes, pickles, and our secret house sauce, all served on a toasted brioche bun with a side of hand-cut fries',
      price: 1899,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    },
  },
};

export const ExpensiveItem: Story = {
  args: {
    item: {
      ...baseItem,
      name: 'Wagyu Beef Steak',
      description: 'Premium A5 Wagyu beef, perfectly grilled to your preference',
      price: 8999, // $89.99
      imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400',
    },
  },
};

export const HiddenItem: Story = {
  args: {
    item: {
      ...baseItem,
      name: 'Hidden Special',
      description: 'This item is hidden from the menu',
      status: 'hidden',
    },
  },
};
