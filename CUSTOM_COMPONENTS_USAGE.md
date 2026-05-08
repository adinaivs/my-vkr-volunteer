# Использование кастомных компонентов

## CustomSelect - Кастомный выпадающий список

### Импорт
```tsx
import CustomSelect from '@/app/components/CustomSelect';
```

### Использование
```tsx
const [selectedValue, setSelectedValue] = useState('');

const options = [
  { value: 'option1', label: 'Опция 1' },
  { value: 'option2', label: 'Опция 2' },
  { value: 'option3', label: 'Опция 3' },
];

<CustomSelect
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  placeholder="Выберите опцию"
  className="w-full"
/>
```

### Замена стандартного select
**Было:**
```tsx
<select value={value} onChange={(e) => setValue(e.target.value)}>
  <option value="">Выберите...</option>
  <option value="option1">Опция 1</option>
  <option value="option2">Опция 2</option>
</select>
```

**Стало:**
```tsx
<CustomSelect
  options={[
    { value: 'option1', label: 'Опция 1' },
    { value: 'option2', label: 'Опция 2' },
  ]}
  value={value}
  onChange={setValue}
  placeholder="Выберите..."
/>
```

---

## CustomDatePicker - Кастомный календарь

### Импорт
```tsx
import CustomDatePicker from '@/app/components/CustomDatePicker';
```

### Использование
```tsx
const [selectedDate, setSelectedDate] = useState('');

<CustomDatePicker
  value={selectedDate}
  onChange={setSelectedDate}
  placeholder="Выберите дату"
  minDate="2024-01-01"
  maxDate="2024-12-31"
  className="w-full"
/>
```

### Замена стандартного input type="date"
**Было:**
```tsx
<input
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  min="2024-01-01"
  max="2024-12-31"
/>
```

**Стало:**
```tsx
<CustomDatePicker
  value={date}
  onChange={setDate}
  minDate="2024-01-01"
  maxDate="2024-12-31"
/>
```

---

## CustomTimePicker - Кастомный выбор времени

### Импорт
```tsx
import CustomTimePicker from '@/app/components/CustomTimePicker';
```

### Использование
```tsx
const [selectedTime, setSelectedTime] = useState('');

<CustomTimePicker
  value={selectedTime}
  onChange={setSelectedTime}
  placeholder="Выберите время"
  className="w-full"
/>
```

### Замена стандартного input type="time"
**Было:**
```tsx
<input
  type="time"
  value={time}
  onChange={(e) => setTime(e.target.value)}
/>
```

**Стало:**
```tsx
<CustomTimePicker
  value={time}
  onChange={setTime}
/>
```

---

## Где заменить стандартные элементы

### 1. Страница создания/редактирования проекта
- Файл: `app/organizer/projects/page.tsx`
- Заменить: select для категорий, date inputs для дат

### 2. Страница создания задач
- Файл: `app/organizer/projects/[id]/page.tsx`
- Заменить: select для навыков, date input для дедлайна

### 3. Фильтры на страницах
- Файлы: различные страницы с фильтрами
- Заменить: все select элементы для фильтрации

### 4. Формы регистрации/профиля
- Файлы: формы с датами рождения, выбором города и т.д.
- Заменить: все select и date inputs

---

## Стилизация

Все компоненты используют единый стиль сайта:
- Цвет акцента: `#00CC00` (зелёный)
- Hover эффекты: `bg-green-50`
- Выбранный элемент: `bg-[#00CC00] text-white`
- Границы: `border-gray-200`
- Тени: `shadow-xl`
- Скругления: `rounded-lg`

Компоненты полностью адаптивны и работают на всех устройствах.
