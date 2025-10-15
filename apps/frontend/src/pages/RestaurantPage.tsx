import { useParams, Link } from 'react-router-dom';
import { Stack, Title, Text, Card, Group, Loader, Center, Alert, Button, Badge } from '@mantine/core';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useRestaurantMenus } from '@/hooks/useRestaurantMenus';

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
                <Card
                  key={menu.id}
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
                        <Badge color="green" variant="light">Active</Badge>
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
                    >
                      View Menu
                    </Button>
                  </Stack>
                </Card>
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
