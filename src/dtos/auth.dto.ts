import { UserRole } from '../entities/User';

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
}
