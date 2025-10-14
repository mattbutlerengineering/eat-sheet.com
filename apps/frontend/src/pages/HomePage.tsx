import { Title, Text, Stack, Center } from '@mantine/core';

export default function HomePage() {
  return (
    <Center h="80vh">
      <Stack align="center" gap="md">
        <Title order={1} size="3rem">
          Eat-Sheet
        </Title>
        <Text size="xl" c="dimmed">
          Beautiful Digital Menus
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          Scan a QR code or enter a restaurant URL to view their menu
        </Text>
      </Stack>
    </Center>
  );
}
