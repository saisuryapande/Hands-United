import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaUsers, FaTools, FaChartBar, FaEnvelope, FaSignOutAlt, FaHandshake, FaKey } from 'react-icons/fa';
import { useState } from 'react';
import { supabase } from '../lib/supabase'; // Ensure this path matches your project structure
import { toast } from 'react-hot-toast'; // Ensure this is installed and imported correctly

function AdminSidebar({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);

  const navItems = [
    { path: '/admin', icon: <FaHome />, label: 'AdminHome' },
    { path: '/admin/users', icon: <FaUsers />, label: 'UserManagement' },
    { path: '/admin/skills', icon: <FaTools />, label: 'SkillsManagement' },
    { path: '/admin/connections', icon: <FaHandshake />, label: 'ConnectionManagement' },
    { path: '/admin/stats', icon: <FaChartBar />, label: 'Stats' },
    { path: '/admin/contacted', icon: <FaEnvelope />, label: 'Contacted' },
    { path: null, icon: <FaKey />, label: 'Update Password', onClick: () => setShowPasswordModal(true) },
  ];

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
    navigate('/login');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const isPasswordValid = (password) => {
    const hasCapitalLetter = /^(?=.*[A-Z])/.test(password);
    const hasSmallLetter = /^(?=.*[a-z])/.test(password);
    const hasNumber = /^(?=.*[0-9])/.test(password);
    const hasSpecialChar = /^(?=.*[!@#$%^&*])/.test(password);
    const hasMinLength = password.length >= 8;

    return hasCapitalLetter && hasSmallLetter && hasNumber && hasSpecialChar && hasMinLength;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      if (!isPasswordValid(passwordData.newPassword)) {
        toast.error("Password does not meet all requirements");
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error("Passwords don't match");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setShowPasswordModal(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      toast.success("Password updated successfully!");
    } catch (error) {
      console.error("Error updating password:", error.message);
      toast.error(error.message || "Failed to update password");
    }
  };

  return (
    <div className="bg-gray-900 text-white w-64 fixed left-0 top-0 bottom-0 flex flex-col z-50">
      <div className="p-4">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2 py-4">
          {navItems.map((item) => (
            <li key={item.label}>
              {item.path ? (
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${
                    location.pathname === item.path ? 'bg-gray-800 text-white' : ''
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button
                  onClick={item.onClick}
                  className="flex items-center space-x-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full text-left"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogoutClick}
          className="flex items-center space-x-3 w-full px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors rounded-lg"
        >
          <FaSignOutAlt className="text-xl" />
          <span>Logout</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Logout</h2>
            <p className="text-gray-700 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Change Password</h2>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password" // Ensure this is explicitly set
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, newPassword: e.target.value });
                  }}
                  onFocus={() => setIsNewPasswordFocused(true)}
                  onBlur={() => setIsNewPasswordFocused(false)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {/* Password Requirements Tooltip - Shown only when focused */}
                {isNewPasswordFocused && (
                  <div className="absolute left-0 bottom-full mb-2 bg-gray-800 text-white text-xs rounded-lg p-3 w-72 z-10 shadow-lg">
                    <ul className="space-y-1">
                      <li className={`flex items-center ${/^(?=.*[A-Z])/.test(passwordData.newPassword) ? 'text-green-400' : 'text-red-400'}`}>
                        {/^(?=.*[A-Z])/.test(passwordData.newPassword) ? (
                          <span className="mr-2">✔</span>
                        ) : (
                          <span className="mr-2">✖</span>
                        )}
                        At least one capital letter
                      </li>
                      <li className={`flex items-center ${/^(?=.*[a-z])/.test(passwordData.newPassword) ? 'text-green-400' : 'text-red-400'}`}>
                        {/^(?=.*[a-z])/.test(passwordData.newPassword) ? (
                          <span className="mr-2">✔</span>
                        ) : (
                          <span className="mr-2">✖</span>
                        )}
                        At least one small letter
                      </li>
                      <li className={`flex items-center ${/^(?=.*[0-9])/.test(passwordData.newPassword) ? 'text-green-400' : 'text-red-400'}`}>
                        {/^(?=.*[0-9])/.test(passwordData.newPassword) ? (
                          <span className="mr-2">✔</span>
                        ) : (
                          <span className="mr-2">✖</span>
                        )}
                        At least one number
                      </li>
                      <li className={`flex items-center ${/^(?=.*[!@#$%^&*])/.test(passwordData.newPassword) ? 'text-green-400' : 'text-red-400'}`}>
                        {/^(?=.*[!@#$%^&*])/.test(passwordData.newPassword) ? (
                          <span className="mr-2">✔</span>
                        ) : (
                          <span className="mr-2">✖</span>
                        )}
                        At least one special character
                      </li>
                      <li className={`flex items-center ${passwordData.newPassword.length >= 8 ? 'text-green-400' : 'text-red-400'}`}>
                        {passwordData.newPassword.length >= 8 ? (
                          <span className="mr-2">✔</span>
                        ) : (
                          <span className="mr-2">✖</span>
                        )}
                        Minimum length 8
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password" // Ensure this is explicitly set
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isPasswordValid(passwordData.newPassword) || passwordData.newPassword !== passwordData.confirmPassword}
                  className={`px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 ${
                    !isPasswordValid(passwordData.newPassword) || passwordData.newPassword !== passwordData.confirmPassword
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSidebar;