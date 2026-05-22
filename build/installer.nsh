!macro customInstall
  ; --- Uzantı kaydı ---
  WriteRegStr HKCR ".etapp" "" "EvrakTakip.Document"
  WriteRegStr HKCR ".etapp" "Content Type" "application/x-etapp"
  
  ; --- Sağ Tık → YENİ menüsü ---
  WriteRegStr HKCR ".etapp\ShellNew" "NullFile" ""
  WriteRegStr HKCR ".etapp\ShellNew" "ItemName" "Evrak Takip Uygulaması Dosyası"
  WriteRegStr HKCR ".etapp\ShellNew" "IconPath" '"$INSTDIR\evraktron.exe",0'

  ; --- ProgID tanımı ---
  WriteRegStr HKCR "EvrakTakip.Document" "" "Evrak Takip Uygulaması (ETAPP) dosyası"
  WriteRegStr HKCR "EvrakTakip.Document\DefaultIcon" "" '"$INSTDIR\evraktron.exe",0'
  WriteRegStr HKCR "EvrakTakip.Document\shell\open\command" "" '"$INSTDIR\evraktron.exe" "%1"'

  ; --- Windows Explorer'ı yenile (hemen görünsün) ---
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  DeleteRegKey HKCR ".etapp"
  DeleteRegKey HKCR "EvrakTakip.Document"
  
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend
