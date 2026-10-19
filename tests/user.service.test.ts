import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateUserDTO } from '../src/dtos/auth.dto';
import { UserRole } from '../src/entities/User';
import * as UserRepository from '../src/repositories/user.repository';
import { hashPassword } from '../src/utils/hash';
import { createUser } from '../src/services/user.service';

vi.mock('../src/repositories/user.repository', () => ({
  findByEmail: vi.fn(),
  createUser: vi.fn(),
  findById: vi.fn(),
}));

vi.mock('../src/utils/hash', () => ({
  hashPassword: vi.fn(),
}));

describe('user service createUser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('hashes the password and returns roles without password data', async () => {
    vi.mocked(UserRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue('hashed-password');
    vi.mocked(UserRepository.createUser).mockImplementation(async (dto) => ({
      id: 'user-id',
      name: dto.name,
      email: dto.email,
      password: dto.password,
      roles: dto.roles,
      createdAt: new Date(),
    }));

    await expect(
      createUser({
        name: 'Joana Secretary',
        email: 'joana@example.com',
        password: 'plain-password',
        roles: [UserRole.SECRETARY],
      }),
    ).resolves.toEqual({
      id: 'user-id',
      name: 'Joana Secretary',
      email: 'joana@example.com',
      roles: [UserRole.SECRETARY],
    });
    expect(hashPassword).toHaveBeenCalledWith('plain-password');
    expect(UserRepository.createUser).toHaveBeenCalledWith({
      name: 'Joana Secretary',
      email: 'joana@example.com',
      password: 'hashed-password',
      roles: [UserRole.SECRETARY],
    });
  });

  it('rejects invalid roles', async () => {
    const dto = {
      name: 'Invalid User',
      email: 'invalid@example.com',
      password: 'secret',
      roles: ['invalid'],
    } as unknown as CreateUserDTO;

    await expect(createUser(dto)).rejects.toMatchObject({
      statusCode: 400,
      code: 'DADOS_INVALIDOS',
    });
    expect(UserRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email with the contract error code', async () => {
    vi.mocked(UserRepository.findByEmail).mockResolvedValue({
      id: 'existing-id',
      name: 'Existing User',
      email: 'existing@example.com',
      password: 'hashed-password',
      roles: [UserRole.SECRETARY],
      createdAt: new Date(),
    });

    await expect(
      createUser({
        name: 'Another User',
        email: 'existing@example.com',
        password: 'secret',
        roles: [UserRole.SECRETARY],
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_JA_CADASTRADO',
    });
  });
});
