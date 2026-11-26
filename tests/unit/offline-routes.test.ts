import { matchRoutes } from 'react-router-dom';
import { expect, it } from 'vitest';
import { router } from '@/app/router';

it('routes the removed online report page to not found while retaining POS pages', () => {
  expect(matchRoutes(router.routes, '/online-reports/shopee')?.at(-1)?.route.path).toBe('*');
  expect(matchRoutes(router.routes, '/business-data')?.at(-1)?.route.path).toBe('/business-data');
  expect(matchRoutes(router.routes, '/app/inventory-outlook')?.at(-1)?.route.path).toBe('/app/inventory-outlook');
});
