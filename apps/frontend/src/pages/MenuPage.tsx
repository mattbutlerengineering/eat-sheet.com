import { useParams } from 'react-router-dom';
import { Stack, Title, Text, Card, Grid, Badge, Loader, Center, Alert, Group, Divider } from '@mantine/core';
import { useMenu } from '@/hooks/useMenu';
import { useMenuItems } from '@/hooks/useMenuItems';
import { groupItemsBySection } from '@/lib/types';
import MenuItemCard from '@/components/MenuItemCard';

export default function MenuPage() {
  const { restaurantSlug, menuSlug } = useParams<{
    restaurantSlug: string;
    menuSlug: string;
  }>();

  const {
    data: menu,
    isLoading: isLoadingMenu,
    error: menuError,
  } = useMenu(restaurantSlug!, menuSlug!);

  const {
    data: items,
    isLoading: isLoadingItems,
    error: itemsError,
  } = useMenuItems(menu?.id || '');

  const isLoading = isLoadingMenu || isLoadingItems;
  const error = menuError || itemsError;

  if (isLoading) {
    return (
      <Center h="50vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (error || !menu) {
    return (
      <Center h="50vh">
        <Alert color="red" title="Error">
          {error instanceof Error ? error.message : 'Menu not found'}
        </Alert>
      </Center>
    );
  }

  const groupedItems = items ? groupItemsBySection(items) : {};
  const sections = Object.keys(groupedItems);

  return (
    <Stack gap="xl">
      {/* Menu Header */}
      <Stack gap="sm">
        <Group>
          <Title order={1}>{menu.name}</Title>
          <Badge color={menu.status === 'active' ? 'green' : 'gray'}>
            {menu.status}
          </Badge>
        </Group>
        {menu.description && (
          <Text size="lg" c="dimmed">
            {menu.description}
          </Text>
        )}
      </Stack>

      {/* Menu Items by Section */}
      {sections.length === 0 ? (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center" py="xl">
            No items available yet. Check back soon!
          </Text>
        </Card>
      ) : (
        sections.map((section) => (
          <Stack key={section} gap="md">
            <Divider
              label={
                <Title order={2} size="h3">
                  {section}
                </Title>
              }
              labelPosition="left"
            />
            <Grid gutter="md">
              {groupedItems[section]
                .filter((item) => item.status !== 'hidden')
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((item) => (
                  <Grid.Col key={item.id} span={{ base: 12, sm: 6, md: 4 }}>
                    <MenuItemCard item={item} />
                  </Grid.Col>
                ))}
            </Grid>
          </Stack>
        ))
      )}
    </Stack>
  );
}
