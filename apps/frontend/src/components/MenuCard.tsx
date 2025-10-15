import { Card, Stack, Group, Title, Text, Button, Badge } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { Menu } from '@/lib/types';

export interface MenuCardProps {
  menu: Menu;
  restaurantSlug: string;
  onViewMenu?: () => void;
}

export default function MenuCard({ menu, restaurantSlug, onViewMenu }: MenuCardProps) {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ minWidth: '250px' }}
    >
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={3}>{menu.name}</Title>
          {menu.status === 'active' && (
            <Badge color="green" variant="light">
              Active
            </Badge>
          )}
          {menu.status === 'draft' && (
            <Badge color="gray" variant="light">
              Draft
            </Badge>
          )}
          {menu.status === 'inactive' && (
            <Badge color="red" variant="light">
              Inactive
            </Badge>
          )}
        </Group>
        {menu.description && (
          <Text size="sm" c="dimmed">
            {menu.description}
          </Text>
        )}
        <Button
          component={Link}
          to={`/${restaurantSlug}/${menu.slug}`}
          variant="light"
          fullWidth
          onClick={onViewMenu}
        >
          View Menu
        </Button>
      </Stack>
    </Card>
  );
}
