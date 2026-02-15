import userRepository from '../repositories/user.repository';
import { User, Role } from '@prisma/client';
import { hashPassword } from '../utils/bcrypt.util';
import { PaginationOptions, FilterOptions } from '../repositories/base.repository';

/**
 * User Service
 * Business logic for user management
 */

/**
 * Find user by email
 * @param email - User email
 * @returns User object or null if not found
 */
export const findByEmail = async (email: string): Promise<User | null> => {
  return userRepository.findByEmail(email);
};

/**
 * Find user by ID
 * @param id - User ID
 * @returns User object or null if not found
 */
export const findById = async (id: string): Promise<User | null> => {
  return userRepository.findById(id);
};

/**
 * Get all users with pagination and filters
 * @param searchTerm - Search term
 * @param filters - Filter options
 * @param pagination - Pagination options
 * @returns Paginated users
 */
export const getAllUsers = async (
  searchTerm?: string,
  filters: FilterOptions = {},
  pagination: PaginationOptions = {}
) => {
  return userRepository.search(searchTerm, filters, pagination);
};

/**
 * Create new user
 * @param userData - User data
 * @returns Created user (without password hash)
 */
export const createUser = async (userData: {
  email: string;
  password: string;
  fullName: string;
  role?: Role;
  isActive?: boolean;
}): Promise<Omit<User, 'passwordHash'>> => {
  // Check if email already exists
  const existingUser = await userRepository.findByEmail(userData.email);
  if (existingUser) {
    throw new Error('Email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(userData.password);

  // Create user
  const user = await userRepository.create({
    email: userData.email,
    passwordHash,
    fullName: userData.fullName,
    role: userData.role || Role.ADMIN,
    isActive: userData.isActive !== undefined ? userData.isActive : true,
  });

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Update user
 * @param id - User ID
 * @param userData - Updated user data
 * @returns Updated user (without password hash)
 */
export const updateUser = async (
  id: string,
  userData: {
    email?: string;
    password?: string;
    fullName?: string;
    role?: Role;
    isActive?: boolean;
  }
): Promise<Omit<User, 'passwordHash'>> => {
  // Check if user exists
  const existingUser = await userRepository.findById(id);
  if (!existingUser) {
    throw new Error('User not found');
  }

  // If email is being updated, check for duplicates
  if (userData.email && userData.email !== existingUser.email) {
    const emailExists = await userRepository.emailExists(userData.email, id);
    if (emailExists) {
      throw new Error('Email already exists');
    }
  }

  // Prepare update data
  const updateData: any = {};
  if (userData.email) updateData.email = userData.email;
  if (userData.fullName) updateData.fullName = userData.fullName;
  if (userData.role) updateData.role = userData.role;
  if (userData.isActive !== undefined) updateData.isActive = userData.isActive;

  // Hash password if provided
  if (userData.password) {
    updateData.passwordHash = await hashPassword(userData.password);
  }

  // Update user
  const user = await userRepository.update(id, updateData);

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Delete user (soft delete)
 * @param id - User ID
 * @returns Deleted user
 */
export const deleteUser = async (id: string): Promise<Omit<User, 'passwordHash'>> => {
  // Check if user exists
  const existingUser = await userRepository.findById(id);
  if (!existingUser) {
    throw new Error('User not found');
  }

  // Soft delete user
  const user = await userRepository.softDelete(id);

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Update last login timestamp
 * @param userId - User ID
 * @returns Updated user object
 */
export const updateLastLogin = async (userId: string): Promise<User> => {
  return userRepository.updateLastLogin(userId);
};
