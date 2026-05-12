import { createContext, useContext } from 'react'

export const EditModeContext = createContext({
  isEditMode: false,
  onRenameType: null,
  onRenameRelation: null,
  onDeleteType: null,
  onDeleteRelation: null,
  onDeleteRef: null,
})

export const useEditMode = () => useContext(EditModeContext)
