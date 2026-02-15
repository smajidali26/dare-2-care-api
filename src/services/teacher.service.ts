import teacherRepository from '../repositories/teacher.repository';
import { Teacher } from '@prisma/client';
import { PaginationOptions, FilterOptions } from '../repositories/base.repository';

/**
 * Teacher Service
 * Business logic for teacher management
 */

/**
 * Find teacher by email
 * @param email - Teacher email
 * @returns Teacher object or null if not found
 */
export const findByEmail = async (email: string): Promise<Teacher | null> => {
  return teacherRepository.findByEmail(email);
};

/**
 * Find teacher by ID
 * @param id - Teacher ID
 * @returns Teacher object or null if not found
 */
export const findById = async (id: string): Promise<Teacher | null> => {
  return teacherRepository.findById(id);
};

/**
 * Get all teachers with pagination and filters
 * @param searchTerm - Search term
 * @param filters - Filter options
 * @param pagination - Pagination options
 * @returns Paginated teachers
 */
export const getAllTeachers = async (
  searchTerm?: string,
  filters: FilterOptions = {},
  pagination: PaginationOptions = {}
) => {
  return teacherRepository.search(searchTerm, filters, pagination);
};

/**
 * Create new teacher
 * @param teacherData - Teacher data
 * @returns Created teacher
 */
export const createTeacher = async (teacherData: {
  fullName: string;
  email: string;
  phoneNumber: string;
  subject: string;
  qualification: string;
  experience: number;
  hireDate?: Date;
  isActive?: boolean;
}): Promise<Teacher> => {
  // Check if email already exists
  const existingTeacher = await teacherRepository.findByEmail(teacherData.email);
  if (existingTeacher) {
    throw new Error('Email already exists');
  }

  // Validate experience
  if (teacherData.experience < 0) {
    throw new Error('Experience cannot be negative');
  }

  if (teacherData.experience > 50) {
    throw new Error('Experience seems unrealistic (max 50 years)');
  }

  // Create teacher
  return teacherRepository.create({
    fullName: teacherData.fullName,
    email: teacherData.email,
    phoneNumber: teacherData.phoneNumber,
    subject: teacherData.subject,
    qualification: teacherData.qualification,
    experience: teacherData.experience,
    hireDate: teacherData.hireDate || new Date(),
    isActive: teacherData.isActive !== undefined ? teacherData.isActive : true,
  });
};

/**
 * Update teacher
 * @param id - Teacher ID
 * @param teacherData - Updated teacher data
 * @returns Updated teacher
 */
export const updateTeacher = async (
  id: string,
  teacherData: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    subject?: string;
    qualification?: string;
    experience?: number;
    hireDate?: Date;
    isActive?: boolean;
  }
): Promise<Teacher> => {
  // Check if teacher exists
  const existingTeacher = await teacherRepository.findById(id);
  if (!existingTeacher) {
    throw new Error('Teacher not found');
  }

  // If email is being updated, check for duplicates
  if (teacherData.email && teacherData.email !== existingTeacher.email) {
    const emailExists = await teacherRepository.emailExists(teacherData.email, id);
    if (emailExists) {
      throw new Error('Email already exists');
    }
  }

  // Validate experience if provided
  if (teacherData.experience !== undefined) {
    if (teacherData.experience < 0) {
      throw new Error('Experience cannot be negative');
    }
    if (teacherData.experience > 50) {
      throw new Error('Experience seems unrealistic (max 50 years)');
    }
  }

  // Update teacher
  return teacherRepository.update(id, teacherData);
};

/**
 * Delete teacher (soft delete)
 * @param id - Teacher ID
 * @returns Deleted teacher
 */
export const deleteTeacher = async (id: string): Promise<Teacher> => {
  // Check if teacher exists
  const existingTeacher = await teacherRepository.findById(id);
  if (!existingTeacher) {
    throw new Error('Teacher not found');
  }

  // Soft delete teacher
  return teacherRepository.softDelete(id);
};

/**
 * Get active teachers
 * @param pagination - Pagination options
 * @returns Paginated active teachers
 */
export const getActiveTeachers = async (pagination: PaginationOptions = {}) => {
  return teacherRepository.findActive(pagination);
};
