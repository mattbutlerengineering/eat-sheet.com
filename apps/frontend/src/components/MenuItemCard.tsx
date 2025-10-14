import { Card, Image, Text, Group, Badge, Stack } from '@mantine/core';
import type { MenuItem } from '@/lib/types';
import { formatPrice } from '@/lib/types';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const isSoldOut = item.status === 'sold_out';

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        height: '100%',
        opacity: isSoldOut ? 0.6 : 1,
      }}
    >
      <Card.Section>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            height={200}
            alt={item.name}
            fit="cover"
          />
        ) : (
          <div
            style={{
              height: 200,
              backgroundColor: '#f1f3f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text c="dimmed">No image</Text>
          </div>
        )}
      </Card.Section>

      <Stack gap="xs" mt="md">
        <Group justify="space-between" align="flex-start">
          <Text fw={600} size="lg" style={{ flex: 1 }}>
            {item.name}
          </Text>
          {isSoldOut && (
            <Badge color="red" variant="filled">
              Sold Out
            </Badge>
          )}
        </Group>

        {item.description && (
          <Text size="sm" c="dimmed" lineClamp={3}>
            {item.description}
          </Text>
        )}

        <Group justify="space-between" mt="md">
          <Text fw={700} size="xl" c="blue">
            {formatPrice(item.price)}
          </Text>
          <Badge color={item.status === 'available' ? 'green' : 'gray'} variant="light">
            {item.status}
          </Badge>
        </Group>
      </Stack>
    </Card>
  );
}
