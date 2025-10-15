import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import MenuCard from './MenuCard';
import type { Menu } from '@/lib/types';

const meta: Meta<typeof MenuCard> = {
  title: 'Components/MenuCard',
  component: MenuCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  argTypes: {
    menu: {
      description: 'Menu data to display',
    },
    restaurantSlug: {
      description: 'Restaurant slug for navigation',
    },
    onViewMenu: {
      description: 'Callback when View Menu button is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MenuCard>;

const baseMenu: Menu = {
  id: '1',
  restaurantId: 'restaurant-1',
  slug: 'dinner-menu',
  name: 'Dinner Menu',
  description: 'Our delicious dinner offerings',
  status: 'active',
  themeConfig: null,
  displayOrder: 0,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export const Active: Story = {
  args: {
    menu: baseMenu,
    restaurantSlug: 'joes-pizza',
  },
};

export const Draft: Story = {
  args: {
    menu: {
      ...baseMenu,
      status: 'draft',
      name: 'Breakfast Menu',
      description: 'Morning specials (coming soon)',
    },
    restaurantSlug: 'joes-pizza',
  },
};

export const Inactive: Story = {
  args: {
    menu: {
      ...baseMenu,
      status: 'inactive',
      name: 'Summer Menu',
      description: 'Seasonal menu - currently unavailable',
    },
    restaurantSlug: 'joes-pizza',
  },
};

export const NoDescription: Story = {
  args: {
    menu: {
      ...baseMenu,
      description: null,
      name: 'Lunch Special',
    },
    restaurantSlug: 'joes-pizza',
  },
};

export const LongDescription: Story = {
  args: {
    menu: {
      ...baseMenu,
      name: 'Premium Tasting Menu',
      description:
        'Experience our carefully curated seven-course tasting menu featuring the finest seasonal ingredients, expertly prepared by our award-winning chefs. Perfect for special occasions and celebrations.',
    },
    restaurantSlug: 'joes-pizza',
  },
};

export const WithClickHandler: Story = {
  args: {
    menu: baseMenu,
    restaurantSlug: 'joes-pizza',
    onViewMenu: () => alert('View Menu clicked!'),
  },
};
