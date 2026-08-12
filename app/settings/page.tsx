// app/settings/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { 
  User, 
  Bell, 
  Trash2,
  LogOut,
  Check,
  AlertCircle,
  Loader2,
  Mail,
  ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Profile
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')

  // Notifications - Only Budget Alerts
  const [budgetAlerts, setBudgetAlerts] = useState(true)

  // Delete Account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'sidebar-collapsed') {
        setIsCollapsed(JSON.parse(event.newValue || 'false'))
      }
    }
    window.addEventListener('storage', handleStorageChange)

    loadUser()

    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const loadUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        setEmail(session.user.email || '')
        setDisplayName(session.user.user_metadata?.full_name || '')
        
        // Load saved notification preferences
        const savedBudgetAlerts = localStorage.getItem('pref-budget-alerts')
        if (savedBudgetAlerts !== null) {
          setBudgetAlerts(savedBudgetAlerts === 'true')
        }
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      if (displayName && user) {
        const { error } = await supabase.auth.updateUser({
          data: { full_name: displayName }
        })
        if (error) throw error
      }
      
      setSuccessMessage('Profile updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = () => {
    localStorage.setItem('pref-budget-alerts', String(budgetAlerts))
    setSuccessMessage('Notification preferences saved!')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

 // app/settings/page.tsx - Updated handleDeleteAccount function

const handleDeleteAccount = async () => {
  if (deleteConfirmText !== 'DELETE') {
    setError('Please type "DELETE" to confirm')
    return
  }

  setDeleting(true)
  setError(null)

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Please sign in to delete your account')
      setDeleting(false)
      return
    }

    console.log('🗑️ Calling delete account API...')

    const response = await fetch('/api/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete account')
    }

    console.log('✅ Account deleted successfully:', result.message)

    // Clear all local storage
    const keysToRemove = [
      'pref-budget-alerts',
      'pref-currency',
      'pref-dateFormat',
      'pref-theme',
      'pref-notifications',
      'sidebar-collapsed'
    ]
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log('✅ Local storage cleared')

    // Sign out and redirect to login
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()

  } catch (error: any) {
    console.error('❌ Error during account deletion:', error)
    setError(error.message || 'Failed to delete account. Please try again or contact support.')
    setDeleting(false)
  }
}

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        // Clear local storage
        const keysToRemove = [
          'pref-budget-alerts',
          'pref-currency',
          'pref-dateFormat',
          'pref-theme',
          'pref-notifications'
        ]
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        
        // Redirect to login page
        router.push('/auth/login')
        router.refresh()
      } catch (error: any) {
        console.error('Error signing out:', error)
        setError(error.message || 'Failed to sign out')
      }
    }
  }

  const getMainPadding = () => {
    if (isMobile) return 'pl-0 pt-16'
    if (isCollapsed) return 'pl-[72px]'
    return 'pl-[240px]'
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: LogOut },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar isMobile={isMobile} />
        <main className={`transition-all duration-300 min-h-screen ${getMainPadding()}`}>
          <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
              <span className="ml-3 text-gray-500">Loading settings...</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isMobile={isMobile} />

      <main className={`transition-all duration-300 min-h-screen ${getMainPadding()}`}>
        <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-navy">Settings</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Manage your account preferences
            </p>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700 text-sm">
              <Check className="w-4 h-4" />
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-card-dark p-2">
                {sections.map((section) => {
                  const Icon = section.icon
                  const isActive = activeSection === section.id
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id)
                        setError(null)
                        setSuccessMessage(null)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-electric-blue text-white font-medium shadow-md'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span className="flex-1 text-left">{section.label}</span>
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto text-white/70 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
                {/* Profile Section */}
                {activeSection === 'profile' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-navy">Profile</h3>
                    <p className="text-sm text-gray-500">Update your profile information</p>
                    
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-500">{email}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                      </div>

                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="w-full px-4 py-2.5 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Notifications Section - Only Budget Alerts */}
                {activeSection === 'notifications' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-navy">Notifications</h3>
                    <p className="text-sm text-gray-500">Manage your notification preferences</p>
                    
                    <div className="space-y-3 mt-4">
                      <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={budgetAlerts}
                          onChange={(e) => setBudgetAlerts(e.target.checked)}
                          className="w-4 h-4 text-electric-blue border-gray-300 rounded focus:ring-electric-blue flex-shrink-0"
                        />
                        <div>
                          <span className="font-medium">Budget Alerts</span>
                          <p className="text-xs text-gray-400">Get notified when you reach 80% and 100% of your budget</p>
                        </div>
                      </label>

                      <button
                        onClick={handleSaveNotifications}
                        className="w-full px-4 py-2.5 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors text-sm font-medium"
                      >
                        Save Preferences
                      </button>
                    </div>
                  </div>
                )}

                {/* Account Section */}
                {activeSection === 'account' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-navy">Account</h3>
                    <p className="text-sm text-gray-500">Manage your account settings</p>
                    
                    <div className="space-y-3 mt-4">
                      {/* Sign Out */}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">Sign Out</span>
                      </button>

                      {/* Delete Account */}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm font-medium text-rose-600 mb-2">Danger Zone</p>
                        {!showDeleteConfirm ? (
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            <div className="text-left">
                              <p className="text-sm font-medium text-rose-700">Delete Account</p>
                              <p className="text-xs text-rose-400">Permanently delete your account and all data</p>
                            </div>
                          </button>
                        ) : (
                          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-3">
                            <p className="text-sm text-rose-700">
                              <span className="font-bold">Warning:</span> This action cannot be undone. 
                              All your data including transactions, budgets, categories, and files will be permanently deleted.
                            </p>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type <span className="font-bold text-rose-600">DELETE</span> to confirm
                              </label>
                              <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type DELETE to confirm"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                              />
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  setShowDeleteConfirm(false)
                                  setDeleteConfirmText('')
                                  setError(null)
                                }}
                                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleDeleteAccount}
                                disabled={deleting || deleteConfirmText !== 'DELETE'}
                                className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deleting ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Deleting...
                                  </span>
                                ) : (
                                  'Delete Account'
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}