import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../src/entities/User';
import * as UserRepository from '../src/repositories/user.repository';
import { comparePassword } from '../src/utils/hash';
import { generateToken } from '../src/utils/jwt';
import { AppError } from '../src/utils/AppError';
import { login } from '../src/services/auth.service';

vi.mock('../src/repositories/user.repository', () => ({
  findByEmail: vi.fn(),
}));

vi.mock('../src/utils/hash', () => ({
  comparePassword: vi.fn(),
}));

vi.mock('../src/utils/jwt', () => ({
  generateToken: vi.fn(),
}));

describe('auth service login', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns an access token with the authenticated user roles', async () => {
    vi.mocked(UserRepository.findByEmail).mockResolvedValue({
      id: 'user-id',
      name: 'Dr. Test',
      email: 'doctor@example.com',
      password: 'hashed-password',
      roles: [UserRole.DOCTOR, UserRole.ADMIN],
      createdAt: new Date(),
    } as never);
    vi.mocked(comparePassword).mockResolvedValue(true);
    vi.mocked(generateToken).mockReturnValue('signed-token');

    await expect(
      login({ email: 'doctor@example.com', password: 'plain-password' }),
    ).resolves.toEqual({ accessToken: 'signed-token' });
    expect(comparePassword).toHaveBeenCalledWith(
      'plain-password',
      'hashed-password',
    );
    expect(generateToken).toHaveBeenCalledWith({
      id: 'user-id',
      roles: [UserRole.DOCTOR, UserRole.ADMIN],
    });
  });

  it('returns the same credentials error for an unknown email', async () => {
    vi.mocked(UserRepository.findByEmail).mockResolvedValue(null);

    await expect(
      login({ email: 'missing@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'CREDENCIAIS_INVALIDAS',
    });
    expect(comparePassword).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password after comparing its hash', async () => {
    vi.mocked(UserRepository.findByEmail).mockResolvedValue({
      id: 'user-id',
      name: 'Dr. Test',
      email: 'doctor@example.com',
      password: 'hashed-password',
      roles: [UserRole.DOCTOR],
      createdAt: new Date(),
    } as never);
    vi.mocked(comparePassword).mockResolvedValue(false);

    await expect(
      login({ email: 'doctor@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(AppError);
    expect(comparePassword).toHaveBeenCalledWith('wrong', 'hashed-password');
  });
});
