import React, { useEffect, useState } from 'react';
import { supabase, User } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, CreditCard as Edit2, Trash2, Search, Mail, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import bcrypt from 'bcryptjs';

export default function EmployeeDirectory() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

  useEffect(() => {
    fetchEmployees();

    const channel = supabase
      .channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchEmployees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchEmployees() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEmployee(employeeId: string) {
    if (!confirm('Are you sure you want to deactivate this employee?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', employeeId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        actor_user_id: user?.id,
        action: 'DEACTIVATE_EMPLOYEE',
        target: employeeId,
        meta: { timestamp: new Date().toISOString() },
      });

      alert('Employee deactivated successfully');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.emp_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Employee Directory
          </h1>
          <p className="text-gray-600">Manage all employees in your organization</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#E31837] hover:bg-[#C4152E] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, ID, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-[#2E2E2E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#E31837] to-[#C4152E] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2E2E2E]">{employee.name}</h3>
                    <p className="text-sm text-gray-600">{employee.emp_id}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                    employee.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {employee.role}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{employee.email}</span>
                </div>
                {employee.department && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span>{employee.department}</span>
                  </div>
                )}
                {employee.joining_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Joined: {format(new Date(employee.joining_date), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedEmployee(employee)}
                  className="flex-1 py-2 px-4 bg-[#0066CC] hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteEmployee(employee.id)}
                  disabled={employee.role === 'admin'}
                  className="flex-1 py-2 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </div>

              <div
                className={`mt-2 text-center py-1 rounded-lg text-xs font-medium ${
                  employee.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {employee.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No employees found</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEmployeeModal onClose={() => setShowAddModal(false)} onSuccess={fetchEmployees} />
      )}

      {selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onSuccess={fetchEmployees}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    emp_id: '',
    department: '',
    role: 'employee',
    joining_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const password = 'TechM@' + Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(password, 10);

      const { error } = await supabase.from('users').insert({
        ...formData,
        password_hash: passwordHash,
        is_active: true,
      });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        actor_user_id: user?.id,
        action: 'CREATE_EMPLOYEE',
        target: formData.email,
        meta: { employee_id: formData.emp_id, timestamp: new Date().toISOString() },
      });

      alert(`Employee created successfully!\nTemporary Password: ${password}\nPlease share this with the employee.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-[#2E2E2E] mb-6">Add New Employee</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Employee ID</label>
            <input
              type="text"
              required
              value={formData.emp_id}
              onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Joining Date</label>
            <input
              type="date"
              value={formData.joining_date}
              onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-[#E31837] hover:bg-[#C4152E] text-white rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditEmployeeModal({
  employee,
  onClose,
  onSuccess,
}: {
  employee: User;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: employee.name,
    email: employee.email,
    department: employee.department || '',
    is_active: employee.is_active,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('users').update(formData).eq('id', employee.id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        actor_user_id: user?.id,
        action: 'UPDATE_EMPLOYEE',
        target: employee.id,
        meta: { changes: formData, timestamp: new Date().toISOString() },
      });

      alert('Employee updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-[#2E2E2E] mb-6">Edit Employee</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-[#E31837] focus:ring-[#E31837] rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-[#2E2E2E]">
              Active Employee
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-[#E31837] hover:bg-[#C4152E] text-white rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
