import { useParams } from 'react-router-dom';
import { Stack, Title, Text, Card, Group, Loader, Center, Alert } from '@mantine/core';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useRestaurantMenus } from '@/hooks/useRestaurantMenus';
import MenuCard from '@/components/MenuCard';

export default function RestaurantPage() {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const { data: restaurant, isLoading, error } = useRestaurant(restaurantSlug!);
  const { data: menusData, isLoading: isLoadingMenus } = useRestaurantMenus(restaurantSlug!);

  if (isLoading) {
    return (
      <Center h="50vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (error || !restaurant) {
    return (
      <Center h="50vh">
        <Alert color="red" title="Error">
          {error instanceof Error ? error.message : 'Restaurant not found'}
        </Alert>
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      {/* Restaurant Header */}
      <Stack gap="sm">
        {restaurant.logoUrl && (
          <img
            src={restaurant.logoUrl}
            alt={`${restaurant.name} logo`}
            style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }}
          />
        )}
        <Title order={1}>{restaurant.name}</Title>
        {restaurant.description && (
          <Text size="lg" c="dimmed">
            {restaurant.description}
          </Text>
        )}
      </Stack>

      {/* Restaurant Info */}
      <Group gap="xl">
        {restaurant.address && (
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Address
            </Text>
            <Text size="sm">{restaurant.address}</Text>
          </Stack>
        )}
        {restaurant.phone && (
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Phone
            </Text>
            <Text size="sm">{restaurant.phone}</Text>
          </Stack>
        )}
        {restaurant.email && (
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Email
            </Text>
            <Text size="sm">{restaurant.email}</Text>
          </Stack>
        )}
      </Group>

      {/* Menus Section */}
      <Stack gap="md">
        <Title order={2}>Menus</Title>
        <Text c="dimmed">
          View our available menus below
        </Text>

        {isLoadingMenus ? (
          <Center>
            <Loader size="md" />
          </Center>
        ) : menusData && menusData.menus && menusData.menus.length > 0 ? (
          <Group gap="md">
            {menusData.menus
              .filter((menu) => menu.status === 'active')
              .map((menu) => (
                <MenuCard
                  key={menu.id}
                  menu={menu}
                  restaurantSlug={restaurantSlug!}
                />
              ))}
          </Group>
        ) : (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text c="dimmed" ta="center" py="xl">
              No menus available yet. Check back soon!
            </Text>
          </Card>
        )}
      </Stack>
    </Stack>
  );
}
