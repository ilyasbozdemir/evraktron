!macro customInstall
  ; --- Uzantı kaydı ---
  WriteRegStr HKCR "etap" "" "EvrakTakip.Document"
  WriteRegStr HKCR "etap" "Content Type" "application/x-etapp"
  
  ; --- Sağ Tık → YENİ menüsü ---
  WriteRegStr HKCR "etap\ShellNew" "NullFile" ""
  WriteRegStr HKCR "etap\ShellNew" "ItemName" "Evrak Takip Programı Dosyası"
  WriteRegStr HKCR "etap\ShellNew" "IconPath" '"$INSTDIR\evraktron.exe",0'

  ; --- ProgID tanımı ---
  WriteRegStr HKCR "EvrakTakip.Document" "" "Evrak Takip Programı (ETAPP) dosyası"
  WriteRegStr HKCR "EvrakTakip.Document\DefaultIcon" "" '"$INSTDIR\evraktron.exe",0'
  WriteRegStr HKCR "EvrakTakip.Document\shell\open\command" "" '"$INSTDIR\evraktron.exe" "%1"'

  ; --- Windows Explorer'ı yenile (hemen görünsün) ---
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  DeleteRegKey HKCR "etap"
  DeleteRegKey HKCR "EvrakTakip.Document"
  
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend
