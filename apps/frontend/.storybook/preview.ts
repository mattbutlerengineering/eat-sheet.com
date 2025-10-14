import React from 'react';
import type { Preview, Decorator } from '@storybook/react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

const withMantine: Decorator = (Story) => {
  return React.createElement(MantineProvider, null, React.createElement(Story));
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [withMantine],
};

export default preview;
