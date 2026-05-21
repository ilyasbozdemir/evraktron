!macro customInstall
  WriteRegStr HKCR ".etapp\ShellNew" "NullFile" ""
  WriteRegStr HKCR ".etapp\ShellNew" "ItemName" "Evrak Takip App Dosyası"
!macroend

!macro customUnInstall
  DeleteRegKey HKCR ".etapp\ShellNew"
!macroend
