CHANGELOG
===============
1.8.3 [June 17]
---------------
- tags autocomplete (the hover animation is a bit choppy - couldnt find the reason)
- some redesigns
- offline mode should be much improved
- ctrl-click or alt-click opens non-editor links in background tabs
- shift-click or alt-click opens editor links in background tabs
- show pinned webnotes in (all) category
- search field is now instant search
- lots of other stuff, bugfixes

1.8.2 [June 10]
----------------
- Notational Velocity style search field: type and hit enter to create a note
- added context menu items for single note delete, and empty trash (the latter only in the (trash) cat). delete and empty trash only work in online mode.
- option: hide webnotes in index (all) category (default: hide them)
- simplenote link in statusbar
- embedded droid font, this means it is always available in offline mode (was only available if it was cached before)

1.8.1 [June 9]
----------------
- redesigned index view a bit, redesigned scroll bars, add webnote button
- new tag cats: shared, published, webnote

1.8 [June 7]
----------------
- added support for the new Webnotes plugin (see features list for a link)
- code refactoring

1.7.1.3 [June 3] 
----------------
- bugfixes

1.7.1 [June 2]

----------------
- option: cascading context menus on/off (separate for pinned and others)
- right click context menu in index view: trash note

1.7 [May 30]
----------------
- basic internationalization: english and german (minus option page)
- replaced all buttons in editor with icons

1.6.7 [May 22]
----------------
- options page: feedback button (for bug reports, feature requests with voting system). please use it!
- tab mode: possibility to *print* current note. implementing print in popup proves to be more difficult.

1.6.6.7 [May 18]
----------------
- alphabetical sort bugfixes, better tab editor behaviour, removed index animations (were causing most of the problems)

1.6.6.1 [May 17]
----------------
- fixed offline mode display bugs in tab view

1.6.5.1 [May 15]
----------------
- sliding animation when note was updated and changes position in index (un/pinning, content change)
- changed some keyboard shortcuts again. new shortcut alt-x to close popup/tab
- lots of small bugfixes

1.6.1 [May 11]
----------------
- option: disable pinning of popout
- option: reset Syncpad
- new shortcuts in index view (ctrl+old ones) to work with tab mode
- huge internal rearrangements/refactoring
- tab mode less laggy and a little less beta

1.6 [May 10]
----------------
- More Space: open Syncpad in a browser tab! The tab is still beta, im aware there might be bugs, so take care using it! Also, index list update handling is still choppy, need to put some more work into that.
To open in tab, open a note and click the new "Popout" button. Will later integrate a button for popping out in index view.
- option: always open Syncpad in tab
- made context menu cascading:
        -> create
        -> append to last
        -> append to pinned -> ...
- show when there are unread changes of a shared note (light green background)
- bugfixes

1.5.3.5 [May 8]
----------------
- context menu: remembers last open note, even if you went back to index
- context menu: shows last open note title in append (Append to "foo")
- context menu: sets editor cursor to note end (if remember cursor option is enabled)
- options: turn off context menu

1.5.3 [May 6]
----------------
- index view: show sync status of a note. if theres a sync icon next to the title this means that local changes to the note has not yet been synchronized with the Simplenote server.
- editor: remember cursor- and scrollposition for each note
- option: toggle remembering cursor- and scrollposition for all notes

1.5.2.10 [May 4]
----------------
- editor: pressing ctrl disables all links
- options: colors for background, editor background and editor font
- bugfixes

1.5.2.9 [May 3]
----------------
- added shortcuts. you can hover over an element (button, checkbox, text input field) to see its shortcut in the tooltip.
- added editor context menu (right click): insert tab url and search for selection.

NOTICE: sadly, i had to add the new extension permission "tabs" for getting the tab url. the permission shows up as "browsing history" in the webstore. since the extension can only connect to the server "simple-note.appspot.com", and i am not in any way affiliated with this company, there is no way for me to get hold of that data, even if i wanted (which i dont).

1.5.2 [May 1]
----------------
- improved context menus: allows to *append* things to last open note now
- better url detection in editor
- some restyling

1.5.1.1 [April 30]
----------------
- improved editor fonts. existing users: please change font in options once and then back to see the changes

1.5.1 [April 30]
----------------
- textwrap in editor
- more fonts, including variable width. if you want a font added, just tell me :) you can find some [here](http://www.google.com/webfonts)
- link clicking should be more responsive

1.5 [April 29, 2011]
----------------
- initial release
