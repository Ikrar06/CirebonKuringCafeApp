'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  X,
  Move,
  Settings,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Trash2
} from 'lucide-react'

interface CustomizationOption {
  id?: string
  option_name: string
  price_adjustment: number
  is_default: boolean
  is_available: boolean
  display_order: number
  ingredient_id?: string
  ingredient_quantity?: number
}

interface CustomizationGroup {
  id?: string
  group_name: string
  group_type: 'single' | 'multiple'
  is_required: boolean
  display_order: number
  options: CustomizationOption[]
}

interface CustomizationBuilderProps {
  menuItemId?: string
  initialGroups?: CustomizationGroup[]
  onSave?: (groups: CustomizationGroup[]) => void
  className?: string
}

export default function CustomizationBuilder({
  menuItemId,
  initialGroups = [],
  onSave,
  className = ''
}: CustomizationBuilderProps) {
  const [groups, setGroups] = useState<CustomizationGroup[]>(initialGroups)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)

  // Common customization templates
  const templates = {
    size: {
      group_name: 'Size',
      group_type: 'single' as const,
      is_required: true,
      options: [
        { option_name: 'Small', price_adjustment: 0, is_default: true, is_available: true, display_order: 0 },
        { option_name: 'Medium', price_adjustment: 2000, is_default: false, is_available: true, display_order: 1 },
        { option_name: 'Large', price_adjustment: 4000, is_default: false, is_available: true, display_order: 2 }
      ]
    },
    ice: {
      group_name: 'Ice Level',
      group_type: 'single' as const,
      is_required: false,
      options: [
        { option_name: 'No Ice', price_adjustment: 0, is_default: false, is_available: true, display_order: 0 },
        { option_name: 'Less Ice', price_adjustment: 0, is_default: false, is_available: true, display_order: 1 },
        { option_name: 'Normal Ice', price_adjustment: 0, is_default: true, is_available: true, display_order: 2 },
        { option_name: 'Extra Ice', price_adjustment: 0, is_default: false, is_available: true, display_order: 3 }
      ]
    },
    sugar: {
      group_name: 'Sugar Level',
      group_type: 'single' as const,
      is_required: false,
      options: [
        { option_name: '0% Sugar', price_adjustment: 0, is_default: false, is_available: true, display_order: 0 },
        { option_name: '25% Sugar', price_adjustment: 0, is_default: false, is_available: true, display_order: 1 },
        { option_name: '50% Sugar', price_adjustment: 0, is_default: false, is_available: true, display_order: 2 },
        { option_name: '75% Sugar', price_adjustment: 0, is_default: true, is_available: true, display_order: 3 },
        { option_name: '100% Sugar', price_adjustment: 0, is_default: false, is_available: true, display_order: 4 }
      ]
    },
    toppings: {
      group_name: 'Add-ons',
      group_type: 'multiple' as const,
      is_required: false,
      options: [
        { option_name: 'Extra Shot', price_adjustment: 5000, is_default: false, is_available: true, display_order: 0 },
        { option_name: 'Whipped Cream', price_adjustment: 3000, is_default: false, is_available: true, display_order: 1 },
        { option_name: 'Extra Syrup', price_adjustment: 2000, is_default: false, is_available: true, display_order: 2 },
        { option_name: 'Decaf', price_adjustment: 0, is_default: false, is_available: true, display_order: 3 }
      ]
    }
  }

  const addGroupFromTemplate = (templateKey: keyof typeof templates) => {
    const template = templates[templateKey]
    const newGroup: CustomizationGroup = {
      ...template,
      display_order: groups.length,
      options: template.options.map((opt, index) => ({ ...opt, display_order: index }))
    }
    setGroups([...groups, newGroup])
  }

  const addCustomGroup = () => {
    const newGroup: CustomizationGroup = {
      group_name: 'New Group',
      group_type: 'single',
      is_required: false,
      display_order: groups.length,
      options: []
    }
    setGroups([...groups, newGroup])
    setEditingGroup(groups.length.toString())
  }

  const updateGroup = (index: number, updates: Partial<CustomizationGroup>) => {
    const newGroups = [...groups]
    newGroups[index] = { ...newGroups[index], ...updates }
    setGroups(newGroups)
  }

  const deleteGroup = (index: number) => {
    const newGroups = groups.filter((_, i) => i !== index)
    // Reorder display_order
    newGroups.forEach((group, i) => {
      group.display_order = i
    })
    setGroups(newGroups)
  }

  const addOption = (groupIndex: number) => {
    const newOption: CustomizationOption = {
      option_name: 'New Option',
      price_adjustment: 0,
      is_default: false,
      is_available: true,
      display_order: groups[groupIndex].options.length
    }

    const newGroups = [...groups]
    newGroups[groupIndex].options.push(newOption)
    setGroups(newGroups)
  }

  const updateOption = (groupIndex: number, optionIndex: number, updates: Partial<CustomizationOption>) => {
    const newGroups = [...groups]
    newGroups[groupIndex].options[optionIndex] = {
      ...newGroups[groupIndex].options[optionIndex],
      ...updates
    }
    setGroups(newGroups)
  }

  const deleteOption = (groupIndex: number, optionIndex: number) => {
    const newGroups = [...groups]
    newGroups[groupIndex].options = newGroups[groupIndex].options.filter((_, i) => i !== optionIndex)
    // Reorder display_order
    newGroups[groupIndex].options.forEach((option, i) => {
      option.display_order = i
    })
    setGroups(newGroups)
  }

  // Auto-save changes to parent component
  useEffect(() => {
    if (onSave) {
      onSave(groups).catch(() => {})
    }
  }, [groups, onSave])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Menu Customizations</h3>
        <p className="text-sm text-gray-600">Configure customization options for this menu item (optional)</p>
      </div>

      {/* Quick Templates */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Templates</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(templates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => addGroupFromTemplate(key as keyof typeof templates)}
              className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              + {template.group_name}
            </button>
          ))}
          <button
            onClick={addCustomGroup}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            + Custom Group
          </button>
        </div>
      </div>

      {/* Customization Groups */}
      <div className="space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="bg-white border border-gray-200 rounded-lg p-4">
            {/* Group Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Move className="h-4 w-4 text-gray-400 cursor-move" />
                <div className="flex-1">
                  {editingGroup === groupIndex.toString() ? (
                    <input
                      type="text"
                      value={group.group_name}
                      onChange={(e) => updateGroup(groupIndex, { group_name: e.target.value })}
                      onBlur={() => setEditingGroup(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingGroup(null)}
                      className="text-lg font-medium bg-transparent border-b border-blue-500 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <h4
                      className="text-lg font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                      onClick={() => setEditingGroup(groupIndex.toString())}
                    >
                      {group.group_name}
                    </h4>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  group.group_type === 'single'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {group.group_type === 'single' ? 'Single Choice' : 'Multiple Choice'}
                </span>
                {group.is_required && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                    Required
                  </span>
                )}
                <button
                  onClick={() => deleteGroup(groupIndex)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Group Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={group.group_type}
                  onChange={(e) => updateGroup(groupIndex, { group_type: e.target.value as 'single' | 'multiple' })}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="single">Single Choice</option>
                  <option value="multiple">Multiple Choice</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => updateGroup(groupIndex, { is_required: !group.is_required })}
                    className="flex items-center"
                  >
                    {group.is_required ? (
                      <ToggleRight className="h-5 w-5 text-blue-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  <span className="text-sm font-medium text-gray-700">Required</span>
                </label>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-gray-700">Options</h5>
                <button
                  onClick={() => addOption(groupIndex)}
                  className="bg-gray-600 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-700 flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Option</span>
                </button>
              </div>

              {group.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Move className="h-3 w-3 text-gray-400 cursor-move" />

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <input
                        type="text"
                        value={option.option_name}
                        onChange={(e) => updateOption(groupIndex, optionIndex, { option_name: e.target.value })}
                        placeholder="Option name"
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        value={option.price_adjustment}
                        onChange={(e) => updateOption(groupIndex, optionIndex, { price_adjustment: parseFloat(e.target.value) || 0 })}
                        placeholder="Price adjustment"
                        className="w-full pl-8 p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={option.is_default}
                          onChange={(e) => {
                            if (e.target.checked && group.group_type === 'single') {
                              // Uncheck other defaults in single choice groups
                              const newGroups = [...groups]
                              newGroups[groupIndex].options.forEach((opt, i) => {
                                opt.is_default = i === optionIndex
                              })
                              setGroups(newGroups)
                            } else {
                              updateOption(groupIndex, optionIndex, { is_default: e.target.checked })
                            }
                          }}
                          className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-600">Default</span>
                      </label>

                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={option.is_available}
                          onChange={(e) => updateOption(groupIndex, optionIndex, { is_available: e.target.checked })}
                          className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-600">Available</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteOption(groupIndex, optionIndex)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {group.options.length === 0 && (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No options added yet</p>
                  <button
                    onClick={() => addOption(groupIndex)}
                    className="mt-2 bg-gray-600 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-700"
                  >
                    Add First Option
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Customizations Yet</h4>
            <p className="text-gray-600 mb-4">Add customization groups to let customers personalize their orders</p>
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => addGroupFromTemplate('size')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Add Size Options
              </button>
              <button
                onClick={addCustomGroup}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Custom Group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
