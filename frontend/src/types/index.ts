export interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  employee_id?: number;
  name?: string;
}

export interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  department?: { id: number; name: string };
  designation?: { id: number; title: string; band?: string };
  location?: { id: number; name: string; city?: string };
  manager?: { id: number; first_name: string; last_name: string; employee_id: string };
  team?: { id: number; name: string };
  direct_reports?: { id: number; first_name: string; last_name: string; employee_id: string }[];
  band?: string;
  employment_type: string;
  status: string;
  joining_date: string;
  profile_photo?: string;
  created_at?: string;
}

export interface Team {
  id: number;
  name: string;
  department_id?: number;
}

export interface EmployeeList {
  items: Employee[];
  total: number;
  page: number;
  per_page: number;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  default_days: number;
  is_paid: boolean;
  carry_forward: boolean;
  max_carry_forward_days: number;
  requires_document: boolean;
  is_active: boolean;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  leave_type?: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_type?: string;
  reason?: string;
  attachment_path?: string;
  status: string;
  current_approval_step: number;
  created_at?: string;
  approvals?: LeaveApproval[];
}

export interface LeaveBalance {
  id: number;
  leave_type: LeaveType;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  carried_forward: number;
  adjusted: number;
  remaining: number;
}

export interface LeaveApproval {
  id: number;
  approver_id: number;
  approver_name?: string;
  step_order: number;
  status: string;
  comments?: string;
  acted_at?: string;
}

export interface LeaveBalanceCheck {
  leave_type: string;
  available: number;
  requested_days: number;
  sufficient: boolean;
  message: string;
}

export interface Department {
  id: number;
  name: string;
  code?: string;
  business_unit_id?: number;
  head_id?: number;
  description?: string;
}

export interface Location {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface Designation {
  id: number;
  title: string;
  level: number;
  band?: string;
}

export interface SalaryRecord {
  id: number;
  employee_id: number;
  effective_date: string;
  base_pay: number;
  bonus: number;
  allowance: number;
  deduction: number;
  total: number;
  currency: string;
  reason?: string;
  created_at?: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at?: string;
}

export interface DashboardStats {
  total_employees: number;
  active_employees: number;
  on_leave_today: number;
  absent_today: number;
  pending_approvals: number;
  new_hires_this_month: number;
  upcoming_holidays: number;
  pending_tickets: number;
  announcements_count: number;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  author_name?: string;
  priority: string;
  is_active: boolean;
  created_at?: string;
}

export interface OrgChartNode {
  id: number;
  employee_id: string;
  name: string;
  designation?: string;
  department?: string;
  profile_photo?: string;
  email?: string;
  location?: string;
  children: OrgChartNode[];
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  created_at?: string;
}

export interface HolidayCalendar {
  id: number;
  name: string;
  year: number;
  location_id?: number;
  holidays: Holiday[];
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  is_optional: boolean;
}

export interface Workflow {
  id: number;
  name: string;
  department_id?: number;
  leave_type_id?: number;
  band?: string;
  is_default: boolean;
  is_active: boolean;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: number;
  step_order: number;
  approver_role: string;
  specific_approver_id?: number;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string;
  hours_worked: number;
  late_minutes?: number;
  notes?: string;
}

export interface HRTicket {
  id: number;
  employee_id: number;
  subject: string;
  description?: string;
  category?: string;
  priority: string;
  status: string;
  assigned_to_id?: number;
  resolution?: string;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  role: string;
  employee_id?: number;
  name?: string;
}
