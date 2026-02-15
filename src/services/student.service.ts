import studentRepository from '../repositories/student.repository';
import { Student } from '@prisma/client';
import { PaginationOptions, FilterOptions } from '../repositories/base.repository';

/**
 * Student Service
 * Business logic for student management
 */

/**
 * Find student by ID
 * @param id - Student ID
 * @returns Student object or null if not found
 */
export const findById = async (id: string): Promise<Student | null> => {
  return studentRepository.findById(id);
};

/**
 * Get all students with pagination and filters
 * @param searchTerm - Search term
 * @param filters - Filter options
 * @param pagination - Pagination options
 * @returns Paginated students
 */
export const getAllStudents = async (
  searchTerm?: string,
  filters: FilterOptions = {},
  pagination: PaginationOptions = {}
) => {
  return studentRepository.search(searchTerm, filters, pagination);
};

/**
 * Create new student
 * @param studentData - Student data
 * @returns Created student
 */
export const createStudent = async (studentData: {
  fullName: string;
  dateOfBirth: Date;
  gender: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string | null;
  schoolName: string;
  grade: string;
  enrollmentDate?: Date;
  isActive?: boolean;
}): Promise<Student> => {
  // Validate age (optional - ensure student is not too old/young)
  const age = calculateAge(studentData.dateOfBirth);
  if (age < 3 || age > 25) {
    throw new Error('Student age must be between 3 and 25 years');
  }

  // Create student
  return studentRepository.create({
    fullName: studentData.fullName,
    dateOfBirth: studentData.dateOfBirth,
    gender: studentData.gender,
    guardianName: studentData.guardianName,
    guardianPhone: studentData.guardianPhone,
    guardianEmail: studentData.guardianEmail,
    schoolName: studentData.schoolName,
    grade: studentData.grade,
    enrollmentDate: studentData.enrollmentDate || new Date(),
    isActive: studentData.isActive !== undefined ? studentData.isActive : true,
  });
};

/**
 * Update student
 * @param id - Student ID
 * @param studentData - Updated student data
 * @returns Updated student
 */
export const updateStudent = async (
  id: string,
  studentData: {
    fullName?: string;
    dateOfBirth?: Date;
    gender?: string;
    guardianName?: string;
    guardianPhone?: string;
    guardianEmail?: string | null;
    schoolName?: string;
    grade?: string;
    enrollmentDate?: Date;
    isActive?: boolean;
  }
): Promise<Student> => {
  // Check if student exists
  const existingStudent = await studentRepository.findById(id);
  if (!existingStudent) {
    throw new Error('Student not found');
  }

  // Validate age if dateOfBirth is being updated
  if (studentData.dateOfBirth) {
    const age = calculateAge(studentData.dateOfBirth);
    if (age < 3 || age > 25) {
      throw new Error('Student age must be between 3 and 25 years');
    }
  }

  // Update student
  return studentRepository.update(id, studentData);
};

/**
 * Delete student (soft delete)
 * @param id - Student ID
 * @returns Deleted student
 */
export const deleteStudent = async (id: string): Promise<Student> => {
  // Check if student exists
  const existingStudent = await studentRepository.findById(id);
  if (!existingStudent) {
    throw new Error('Student not found');
  }

  // Soft delete student
  return studentRepository.softDelete(id);
};

/**
 * Get active students
 * @param pagination - Pagination options
 * @returns Paginated active students
 */
export const getActiveStudents = async (pagination: PaginationOptions = {}) => {
  return studentRepository.findActive(pagination);
};

/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth
 * @returns Age in years
 */
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
