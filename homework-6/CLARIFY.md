# Роз'яснення до завдання: ШІ-Агенти проти TypeScript-Скриптів

У цьому завданні слово «агент» використовується у двох абсолютно різних значеннях. Оскільки ми домовилися використовувати **TypeScript**, давайте розділимо все на два рівні, щоб уникнути плутанини:

## Рівень 1: «ШІ-Агенти» (AI Meta-Agents) — це ваші помічники (Claude Code)
Це **НЕ** TypeScript скрипти. Це ролі, які ви призначаєте штучному інтелекту (Claude Code), щоб він допоміг вам зробити домашнє завдання. Ви виступаєте в ролі менеджера, а Claude Code виконує роботу за чотирьох спеціалістів:

1. **AI Agent 1 (Бізнес-аналітик):** Ви просите Claude: *"Напиши специфікацію проєкту"*. Він генерує Markdown файл.
2. **AI Agent 2 (Програміст):** Ви просите Claude: *"Напиши TypeScript код для обробки транзакцій"*. Він генерує `.ts` файли.
3. **AI Agent 3 (QA Інженер / DevOps):** Ви просите Claude: *"Напиши юніт-тести на Jest і налаштуй Git Hooks"*.
4. **AI Agent 4 (Технічний письменник):** Ви просите Claude: *"Напиши README.md"*.

## Рівень 2: «TypeScript-Агенти» (Pipeline Agents) — це сам код
Це те, що згенерує **AI Agent 2**. У контексті банківської системи "агентами" називають прості TypeScript скрипти (або функції), які виконують конкретну бізнес-логіку. Штучного інтелекту в них **немає** — це просто жорстко прописаний код.

Ось як виглядатимуть ваші TypeScript скрипти (згенеровані Клодом):

1. **`integrator.ts` (Головний скрипт):** Читає початковий JSON, створює папки `shared/...`, і по черзі запускає інші TypeScript-скрипти.
2. **`validatorAgent.ts`:** Читає файл з папки `shared/input`. Перевіряє регулярками або звичайним кодом наявність полів (напр., amount, currency). Переміщує файл у папку `shared/processing` або записує помилку.
3. **`fraudDetectorAgent.ts`:** Читає файл з `shared/processing`. Робить просту математику (наприклад, сума > 10000 = ризик). Переміщує в `shared/output`.
4. **`complianceAgent.ts`:** Робить фінальну перевірку і кладе готовий результат у `shared/results`.

---

## Блок-схеми виконання завдань

Ось візуалізація процесу у вигляді блок-схем, адаптована під роботу з Claude Code.

### 1. Загальний процес виконання завдання (Claude Code Workflow)

Ця схема показує, в якому порядку потрібно виконувати завдання і які артефакти (результати) ви повинні отримати після кожного кроку.

```mermaid
flowchart TD
    Start([Початок роботи з Claude Code]) --> Task1
    
    subgraph Task1Group["Task 1: Специфікація (Agent 1)"]
        Task1[Створення специфікації] --> R1_1(Створюється файл specification.md)
        Task1 --> R1_2(Створюється slash-команда)
        Task1 --> R1_3(Оновлюється agents.md)
    end
    
    R1_1 --> Task2
    
    subgraph Task2Group["Task 2: Написання коду (Agent 2)"]
        Task2[Генерація конвеєра] --> R2_1(Код інтегратора - integrator.ts)
        Task2 --> R2_2(Код 3-х агентів: validator, fraud, compliance)
        Task2 --> R2_3(Структура папок: shared/)
        Task2 --> R2_4(Дослідження: research-notes.md)
    end
    
    R2_1 --> Task3
    
    subgraph Task3Group["Task 3: Команди Claude та Хуки (Agent 3)"]
        Task3[Створення скілів для Claude] --> R3_1(Скіл: run-pipeline.md)
        Task3 --> R3_2(Скіл: validate-transactions.md)
        Task3 --> R3_3(Git pre-push хук)
    end
    
    R3_1 --> Task4
    
    subgraph Task4Group["Task 4: Інтеграція з MCP"]
        Task4[Налаштування серверів для Claude] --> R4_1(Файл mcp.json)
        Task4 --> R4_2(Власний FastMCP сервер)
        Task4 --> R4_3(Claude отримує доступ)
    end
    
    R4_1 --> Task5
    
    subgraph Task5Group["Task 5: Тести та Документація (Agent 4)"]
        Task5[Генерація тестів і README] --> R5_1(Тести в папці tests/)
        Task5 --> R5_2(README.md та HOWTORUN.md)
        Task5 --> R5_3(5 обов'язкових скріншотів)
    end
    
    R5_3 --> Finish([Створення Pull Request])
    
    classDef result fill:#d4edda,stroke:#28a745,stroke-width:2px,color:#155724;
    class R1_1,R1_2,R1_3,R2_1,R2_2,R2_3,R2_4,R3_1,R3_2,R3_3,R4_1,R4_2,R4_3,R5_1,R5_2,R5_3 result;
```

### 2. Як працює сам Pipeline (Те, що згенерує Agent 2)

```mermaid
sequenceDiagram
    participant I as Integrator (integrator.ts)
    participant V as Validator (validatorAgent.ts)
    participant F as Fraud Detector (fraudDetectorAgent.ts)
    participant C as Compliance (complianceAgent.ts)
    participant FS as shared/ (Файлова система)

    I->>FS: 1. Бере sample-transactions.json
    I->>FS: 2. Розділяє на файли в shared/input/
    
    I->>V: 3. Запускає Validator
    V->>FS: Читає з shared/input/
    V->>V: Перевіряє формат
    V->>FS: Пише результат у shared/processing/
    
    I->>F: 4. Запускає Fraud Detector
    F->>FS: Читає з shared/processing/
    F->>F: Перевіряє суму
    F->>FS: Пише результат у shared/output/
    
    I->>C: 5. Запускає Compliance
    C->>FS: Читає з shared/output/
    C->>C: Фінальна перевірка
    C->>FS: Пише результат у shared/results/
    
    I->>FS: 6. Збирає всі результати
    I-->>I: 7. Генерує фінальний звіт
```

### 3. Схема роботи з Claude Code та MCP

```mermaid
flowchart LR
    User([Ви]) -->|Набираєте /run-pipeline| Claude(Claude Code)
    
    subgraph Ваш комп'ютер
        Claude -->|Виконує кроки зі скіла| Script(ts-node integrator.ts)
        Script -->|Обробляє транзакції| Results[(shared/results/)]
    end
    
    Claude -.->|Читає статус| MCPServer(Ваш FastMCP сервер)
    MCPServer -.->|Інструмент: get_transaction_status| Results
    
    Claude -.->|Шукає документацію| Context7(context7 MCP сервер)
    Context7 -.->|Повертає приклади коду| Claude

    classDef mcp fill:#cce5ff,stroke:#004085,stroke-width:2px,color:#004085;
    class MCPServer,Context7 mcp;
```
