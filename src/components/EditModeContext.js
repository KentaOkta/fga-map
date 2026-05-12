import { createContext, useContext } from 'react'

export const EditModeContext = createContext({
  isEditMode: false,
  onRenameType: null,
  onRenameRelation: null,
  onDeleteType: null,
  onDeleteRelation: null,
  onDeleteRef: null,
  onAddRefCondition: null,
  onSelectCondition: null,
  onDeleteCondition: null,
})

export const useEditMode = () => useContext(EditModeContext)
