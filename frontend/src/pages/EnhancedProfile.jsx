import React, { useState } from "react";
import { User, Mail, Phone, MapPin, Briefcase, Award, Settings, Save, X, Edit2, Camera, Shield, Bell, Eye, Lock } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { id: 'investor', label: 'Investor', icon: '💰' },
  { id: 'analyst', label: 'Analyst', icon: '📊' },
  { id: 'trader', label: 'Trader', icon: '📈' },
  { id: 'researcher', label: 'Researcher', icon: '🔬' },
  { id: 'advisor', label: 'Advisor', icon: '🎯' }
];

const EXPERTISE_AREAS = [
  'Equities', 'Derivatives', 'Fixed Income', 'Commodities',
  'Forex', 'Crypto', 'Options', 'Futures', 'Bonds', 'Mutual Funds'
];

const NOTIFICATION_PREFERENCES = [
  { id: 'price_alerts', label: 'Price Alerts', description: 'Get notified when prices hit your targets' },
  { id: 'news_updates', label: 'News Updates', description: 'Latest market news and analysis' },
  { id: 'portfolio_changes', label: 'Portfolio Changes', description: 'Updates on your portfolio performance' },
  { id: 'sector_insights', label: 'Sector Insights', description: 'Sector-specific analysis and trends' },
  { id: 'risk_alerts', label: 'Risk Alerts', description: 'Important risk notifications' },
  { id: 'weekly_digest', label: 'Weekly Digest', description: 'Summary of the week\'s market activity' }
];

function ProfileSection({ title, icon: Icon, children, isEditing, onEdit, onSave }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--orange)]/10 flex items-center justify-center">
            <Icon size={20} className="text-[var(--orange)]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {!isEditing && (
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Edit2 size={16} className="text-gray-500" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EditableField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input-base w-full"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <select value={value} onChange={onChange} className="input-base w-full">
        <option value="">Select {label.toLowerCase()}</option>
        {options.map(opt => (
          <option key={opt.id || opt} value={opt.id || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxGroup({ label, options, selected, onChange }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="space-y-2">
        {options.map(option => (
          <label key={option.id} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={e => {
                if (e.target.checked) {
                  onChange([...selected, option.id]);
                } else {
                  onChange(selected.filter(id => id !== option.id));
                }
              }}
              className="w-4 h-4 rounded border-gray-300 text-[var(--orange)] focus:ring-[var(--orange)]"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{option.label}</p>
              {option.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function EnhancedProfile() {
  const { user } = useAuth();
  const [editingSection, setEditingSection] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: "Deepak",
    lastName: "Yastha",
    email: user?.email || "deepkayastha6890@gmail.com",
    phone: "+91 98765 43210",
    location: "Mumbai, India",
    company: "AEGIS Financial",
    designation: "Senior Analyst",
    role: "analyst",
    bio: "Financial analyst with 5+ years of experience in equity markets",
    expertise: ["Equities", "Derivatives", "Options"],
    notifications: ["price_alerts", "news_updates", "portfolio_changes"],
    twoFactorAuth: true,
    dataPrivacy: "standard",
    theme: "auto"
  });

  const handleFieldChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSection = () => {
    setEditingSection(null);
    // In real app, save to backend
  };

  return (
    <PageLayout title="Profile Settings">
      <div className="space-y-6 pb-10 max-w-4xl">
        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Account</p>
          <h1 className="page-heading">Profile Settings</h1>
          <p className="page-subheading">Manage your account information, preferences, and security settings.</p>
        </div>

        {/* Profile Avatar Section */}
        <div className="card p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[var(--orange)] to-orange-600 flex items-center justify-center text-white text-5xl font-bold">
                {profileData.firstName[0]}{profileData.lastName[0]}
              </div>
              <button className="absolute bottom-0 right-0 p-3 rounded-xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
                <Camera size={18} className="text-[var(--orange)]" />
              </button>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {profileData.firstName} {profileData.lastName}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{profileData.designation}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {profileData.expertise.map(exp => (
                  <span key={exp} className="px-3 py-1 rounded-lg bg-[var(--orange)]/10 text-[var(--orange)] text-sm font-medium">
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <ProfileSection
          title="Personal Information"
          icon={User}
          isEditing={editingSection === 'personal'}
          onEdit={() => setEditingSection('personal')}
          onSave={handleSaveSection}
        >
          {editingSection === 'personal' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField
                  label="First Name"
                  value={profileData.firstName}
                  onChange={e => handleFieldChange('firstName', e.target.value)}
                />
                <EditableField
                  label="Last Name"
                  value={profileData.lastName}
                  onChange={e => handleFieldChange('lastName', e.target.value)}
                />
              </div>
              <EditableField
                label="Bio"
                value={profileData.bio}
                onChange={e => handleFieldChange('bio', e.target.value)}
                placeholder="Tell us about yourself"
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveSection}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--orange)] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Save size={16} />
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">First Name</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.firstName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Name</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.lastName}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Bio</p>
                <p className="text-base text-gray-900 dark:text-white">{profileData.bio}</p>
              </div>
            </div>
          )}
        </ProfileSection>

        {/* Contact Information */}
        <ProfileSection
          title="Contact Information"
          icon={Mail}
          isEditing={editingSection === 'contact'}
          onEdit={() => setEditingSection('contact')}
          onSave={handleSaveSection}
        >
          {editingSection === 'contact' ? (
            <div className="space-y-4">
              <EditableField
                label="Email Address"
                value={profileData.email}
                onChange={e => handleFieldChange('email', e.target.value)}
                type="email"
              />
              <EditableField
                label="Phone Number"
                value={profileData.phone}
                onChange={e => handleFieldChange('phone', e.target.value)}
                type="tel"
              />
              <EditableField
                label="Location"
                value={profileData.location}
                onChange={e => handleFieldChange('location', e.target.value)}
                placeholder="City, Country"
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveSection}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--orange)] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Save size={16} />
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.location}</p>
                </div>
              </div>
            </div>
          )}
        </ProfileSection>

        {/* Professional Information */}
        <ProfileSection
          title="Professional Information"
          icon={Briefcase}
          isEditing={editingSection === 'professional'}
          onEdit={() => setEditingSection('professional')}
          onSave={handleSaveSection}
        >
          {editingSection === 'professional' ? (
            <div className="space-y-4">
              <EditableField
                label="Company"
                value={profileData.company}
                onChange={e => handleFieldChange('company', e.target.value)}
              />
              <EditableField
                label="Designation"
                value={profileData.designation}
                onChange={e => handleFieldChange('designation', e.target.value)}
              />
              <SelectField
                label="Role"
                value={profileData.role}
                onChange={e => handleFieldChange('role', e.target.value)}
                options={ROLES}
              />
              <CheckboxGroup
                label="Areas of Expertise"
                options={EXPERTISE_AREAS.map(area => ({ id: area, label: area }))}
                selected={profileData.expertise}
                onChange={value => handleFieldChange('expertise', value)}
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveSection}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--orange)] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Save size={16} />
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Briefcase size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Company</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Award size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Designation</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.designation}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Role</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ROLES.find(r => r.id === profileData.role)?.icon}</span>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {ROLES.find(r => r.id === profileData.role)?.label}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Expertise</p>
                <div className="flex flex-wrap gap-2">
                  {profileData.expertise.map(exp => (
                    <span key={exp} className="px-3 py-1 rounded-lg bg-[var(--orange)]/10 text-[var(--orange)] text-sm font-medium">
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ProfileSection>

        {/* Notification Preferences */}
        <ProfileSection
          title="Notification Preferences"
          icon={Bell}
          isEditing={editingSection === 'notifications'}
          onEdit={() => setEditingSection('notifications')}
          onSave={handleSaveSection}
        >
          {editingSection === 'notifications' ? (
            <div className="space-y-4">
              <CheckboxGroup
                label="Notification Settings"
                options={NOTIFICATION_PREFERENCES}
                selected={profileData.notifications}
                onChange={value => handleFieldChange('notifications', value)}
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveSection}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--orange)] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Save size={16} />
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {profileData.notifications.map(notifId => {
                const notif = NOTIFICATION_PREFERENCES.find(n => n.id === notifId);
                return (
                  <div key={notifId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Bell size={16} className="text-[var(--orange)]" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{notif?.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{notif?.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ProfileSection>

        {/* Security Settings */}
        <ProfileSection
          title="Security Settings"
          icon={Shield}
          isEditing={editingSection === 'security'}
          onEdit={() => setEditingSection('security')}
          onSave={handleSaveSection}
        >
          {editingSection === 'security' ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileData.twoFactorAuth}
                    onChange={e => handleFieldChange('twoFactorAuth', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[var(--orange)] focus:ring-[var(--orange)]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                  </div>
                </label>
              </div>
              <SelectField
                label="Data Privacy Level"
                value={profileData.dataPrivacy}
                onChange={e => handleFieldChange('dataPrivacy', e.target.value)}
                options={[
                  { id: 'strict', label: 'Strict - Minimal data collection' },
                  { id: 'standard', label: 'Standard - Normal data collection' },
                  { id: 'enhanced', label: 'Enhanced - Personalized experience' }
                ]}
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveSection}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--orange)] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Save size={16} />
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock size={18} className="text-[var(--orange)]" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {profileData.twoFactorAuth ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  profileData.twoFactorAuth
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {profileData.twoFactorAuth ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Data Privacy</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {profileData.dataPrivacy === 'strict' ? 'Strict - Minimal data collection' :
                   profileData.dataPrivacy === 'standard' ? 'Standard - Normal data collection' :
                   'Enhanced - Personalized experience'}
                </p>
              </div>
            </div>
          )}
        </ProfileSection>

        {/* Preferences */}
        <ProfileSection
          title="Display Preferences"
          icon={Eye}
          isEditing={editingSection === 'preferences'}
          onEdit={() => setEditingSection('preferences')}
          onSave={handleSaveSection}
        >
          {editingSection === 'preferences' ? (
            <div className="space-y-4">
              <SelectField
                label="Theme"
                value={profileData.theme}
                onChange={e => handleFieldChange('theme', e.target.value)}
                options={[
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' },
                  { id: 'auto', label: 'Auto (System)' }
                ]}
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveSection}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--orange)] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Save size={16} />
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Theme</p>
              <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
                {profileData.theme === 'auto' ? 'Auto (System)' : profileData.theme}
              </p>
            </div>
          )}
        </ProfileSection>
      </div>
    </PageLayout>
  );
}