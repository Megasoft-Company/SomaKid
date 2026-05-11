/**
 * SOMAKID AI - HTML Root
 * Custom HTML wrapper for web rendering.
 */

import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>SOMAKID AI</title>
        <ScrollViewStyleReset />
      </head>
      <body>{/* App content rendered by Expo Router */}</body>
    </html>
  );
}