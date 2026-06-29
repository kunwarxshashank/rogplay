# Tab Visibility Settings — Implementation Plan

## Goal
Add options to general settings to hide up to 2 tabs from the mobile bottom bar and TV sidebar. Hideable tabs: Home, Cinema, Music, Tools, Addons. Settings tab is NOT hideable.

---

## 1. `store/settingsStore.ts`

### State interface additions
```ts
hiddenTabs: string[];
setHiddenTabs: (tabs: string[]) => void;
```

### Default value
```ts
hiddenTabs: [],
```

### New action — add after `setHasSeenAddonFTUE`:
```ts
setHiddenTabs: (tabs) => set({ hiddenTabs: tabs }),
```

### `resetToDefaults` — add line:
```ts
hiddenTabs: [],
```

---

## 2. `app/(mobile)/(tabs)/settings/general.tsx`

### New section array entry — add after "User Experience" section:
```ts
{
    title: "Tab Visibility",
    note: "You can hide up to 2 tabs at most",
    items: [
        { id: 'home', icon: 'home', label: 'Bottom Menu', type: 'tab-toggle', value: settings.hiddenTabs.includes('home'), action: () => toggleTab('home') },
        { id: 'cinema', icon: 'movie-filter', label: 'Cinema', type: 'tab-toggle', value: settings.hiddenTabs.includes('cinema'), action: () => toggleTab('cinema') },
        { id: 'music', icon: 'library-music', label: 'Music', type: 'tab-toggle', value: settings.hiddenTabs.includes('local-music'), action: () => toggleTab('local-music') },
        { id: 'tools', icon: 'construct', label: 'Tools', type: 'tab-toggle', value: settings.hiddenTabs.includes('tools'), action: () => toggleTab('tools') },
        { id: 'addons', icon: 'apps', label: 'Addons', type: 'tab-toggle', value: settings.hiddenTabs.includes('addons'), action: () => toggleTab('addons') },
    ],
}
```

### `toggleTab` helper — add before `sections`:
```ts
const toggleTab = (tabId: string) => {
    const current = settings.hiddenTabs;
    if (current.includes(tabId)) {
        settings.setHiddenTabs(current.filter(t => t !== tabId));
    } else {
        if (current.length >= 2) {
            Alert.alert('Limit Reached', 'You can hide up to 2 tabs at most. Unhide a tab first.');
            return;
        }
        settings.setHiddenTabs([...current, tabId]);
    }
};
```

### Render handler for `type === 'tab-toggle'` — add after existing type handlers:
```tsx
{item.type === 'tab-toggle' && (
    <Switch
        value={!!item.value}
        onValueChange={item.action}
        trackColor={{ false: '#2d3748', true: currentColors.error }}
        thumbColor="#f4f3f4"
    />
)}
```

### Section note rendering — add right after section title inside `.section` map:
```tsx
{section.note && (
    <Text style={[styles.sectionNote, { color: currentColors.textMuted }]}>{section.note}</Text>
)}
```

### Import `Alert` — add to react-native import:
```ts
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Modal, Alert } from 'react-native';
```

### Section note style — add to StyleSheet:
```ts
sectionNote: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
    marginBottom: 12,
},
```

---

## 3. `app/(mobile)/(tabs)/_layout.tsx`

### Add import for settingsStore:
```ts
import { useSettingsStore } from '@/store/settingsStore';
```

### Inside `TabLayout` component — add hiddenTabs state:
```ts
const hiddenTabs = useSettingsStore(s => s.hiddenTabs);
```

### For each hideable `Tabs.Screen`, conditionally set `tabBarButton`:
Pattern:
```tsx
<Tabs.Screen
    name="cinema"
    options={{
        tabBarIcon: cinemaIcon,
        tabBarLabel: 'Cinema',
        tabBarButton: hiddenTabs.includes('cinema') ? () => null : undefined,
    }}
/>
```

Tabs and their IDs:
| name | ID |
|---|---|
| `index` | `home` |
| `cinema` | `cinema` |
| `local-music` | `local-music` |
| `tools` | `tools` |
| `addons` | `addons` |
| `settings` | NOT hideable — no change |

---

## 4. `components/TVSidebarNav.tsx`

### Add import:
```ts
import { useSettingsStore } from '@/store/settingsStore';
```

### Inside `TVSidebarNav` component — add:
```ts
const hiddenTabs = useSettingsStore(s => s.hiddenTabs);
```

### Update `visibleRouteEntries` filter (~line 80-82):
```ts
const visibleRouteEntries = state.routes.filter((e: any) =>
    NAV_ITEMS.some(n => n.route === e.route.name) &&
    !hiddenTabs.includes(e.route.name)
);
```

Route ID mapping for TV sidebar:
| route | ID |
|---|---|
| `index` | `home` |
| `addons` | `addons` |
| `tools` | `tools` |

(`search`, `settings`, `account` are NOT hideable)

---

## Files to edit (4 total)
1. `store/settingsStore.ts`
2. `app/(mobile)/(tabs)/settings/general.tsx`
3. `app/(mobile)/(tabs)/_layout.tsx`
4. `components/TVSidebarNav.tsx`
