import { test, expect } from '@playwright/test';
import { ApiClient } from '../../utils/api-client';
import { loadJsonData } from '../../utils/test-data-loader';
import { assertApiResponse } from '../../utils/helpers';

// ─── Test Data Types ──────────────────────────────────────────────────────────

interface ApiPostPayload {
  createPost: { title: string; body: string; userId: number };
  updatePost: { title: string; body: string; userId: number };
}

// JSONPlaceholder /posts response shape
interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

// JSONPlaceholder /users response shape
interface User {
  id: number;
  name: string;
  email: string;
  username: string;
}

// ─── Load Test Data ───────────────────────────────────────────────────────────

const testData = loadJsonData<ApiPostPayload>('api-users.json');

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe('JSONPlaceholder API Tests', () => {
  let api: ApiClient;

  test.beforeAll(async () => {
    api = await new ApiClient('https://jsonplaceholder.typicode.com').init();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  // ─── GET /users ──────────────────────────────────────────────────────────

  test('GET /users — should return a list of 10 users @smoke', async () => {
    const response = await api.get('/users');
    const body = await assertApiResponse<User[]>(response, 200);

    expect(body, 'JSONPlaceholder /users should return exactly 10 seed users').toHaveLength(10);
    expect(body[0].id, 'First user should have id=1').toBe(1);
    expect(body[0].email, 'First user should have a non-empty email').toBeTruthy();
  });

  test('GET /users/1 — should return user with id 1 @smoke', async () => {
    const response = await api.get('/users/1');
    const body = await assertApiResponse<User>(response, 200);

    expect(body.id, 'Returned user id should be 1').toBe(1);
    expect(body.name, 'User should have a non-empty name').toBeTruthy();
    expect(body.email, 'User should have a non-empty email').toBeTruthy();
    expect(typeof body.email, 'email should be a string').toBe('string');
  });

  test('GET /users/0 — should return 404 for out-of-range user id @regression', async () => {
    // JSONPlaceholder only seeds users 1–10; id=0 returns 404
    const response = await api.get('/users/0');
    expect(response.status(), 'User id=0 should not exist').toBe(404);
  });

  // ─── GET /posts ──────────────────────────────────────────────────────────

  test('GET /posts — should return a list of 100 posts @smoke', async () => {
    const response = await api.get('/posts');
    const body = await assertApiResponse<Post[]>(response, 200);

    expect(body, 'JSONPlaceholder /posts should return exactly 100 seed posts').toHaveLength(100);
  });

  test('GET /posts/1 — should return post with id 1 @smoke', async () => {
    const response = await api.get('/posts/1');
    const body = await assertApiResponse<Post>(response, 200);

    expect(body.id, 'Post id should be 1').toBe(1);
    expect(body.title, 'Post should have a title').toBeTruthy();
    expect(body.userId, 'Post should reference a userId').toBeGreaterThan(0);
  });

  // ─── POST /posts ─────────────────────────────────────────────────────────

  test('POST /posts — should create a new post and return 201 @regression', async () => {
    const payload = {
      title: testData.createPost.title,
      body: testData.createPost.body,
      userId: testData.createPost.userId,
    };
    const response = await api.post('/posts', { data: payload });
    const body = await assertApiResponse<Post>(response, 201);

    // JSONPlaceholder echoes the sent data and assigns id=101 for new posts
    expect(body.title, 'Response should echo the submitted title').toBe(payload.title);
    expect(body.body, 'Response should echo the submitted body').toBe(payload.body);
    expect(body.userId, 'Response should echo the submitted userId').toBe(payload.userId);
    expect(body.id, 'New post should be assigned a numeric id').toBeGreaterThan(0);
  });

  // ─── PUT /posts/1 ────────────────────────────────────────────────────────

  test('PUT /posts/1 — should update a post and return 200 @regression', async () => {
    const payload = {
      id: 1,
      title: testData.updatePost.title,
      body: testData.updatePost.body,
      userId: testData.updatePost.userId,
    };
    const response = await api.put('/posts/1', { data: payload });
    const body = await assertApiResponse<Post>(response, 200);

    expect(body.title, 'Response should echo the updated title').toBe(payload.title);
    expect(body.body, 'Response should echo the updated body').toBe(payload.body);
    expect(body.id, 'Response should preserve post id=1').toBe(1);
  });

  // ─── DELETE /posts/1 ─────────────────────────────────────────────────────

  test('DELETE /posts/1 — should delete a post and return 200 @regression', async () => {
    const response = await api.delete('/posts/1');
    // JSONPlaceholder returns 200 with empty body {} for DELETE
    expect(response.status(), 'DELETE should return 200').toBe(200);
    const body = await response.json();
    expect(
      Object.keys(body as object),
      'DELETE response body should be empty {}',
    ).toHaveLength(0);
  });

  // ─── 404 handling ────────────────────────────────────────────────────────

  test('GET /posts/99999 — should return 404 for non-existent post @regression', async () => {
    // JSONPlaceholder returns 404 for /posts/{id} where id > 100
    const response = await api.get('/posts/99999');
    expect(response.status(), 'Non-existent post should return 404').toBe(404);
  });

  // ─── Schema validation ───────────────────────────────────────────────────

  test('GET /posts/1 — response should contain all required schema fields @regression', async () => {
    const response = await api.get('/posts/1');
    const body = await assertApiResponse<Post>(response, 200);

    const requiredFields: (keyof Post)[] = ['id', 'title', 'body', 'userId'];
    for (const field of requiredFields) {
      expect(body, `Response should contain field "${field}"`).toHaveProperty(field);
    }
  });
});
