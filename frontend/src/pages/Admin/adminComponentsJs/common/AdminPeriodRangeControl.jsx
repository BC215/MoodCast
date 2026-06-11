import { useEffect, useMemo, useState } from "react";
import styles from "../../adminComponentsCss/common/AdminPeriodRangeControl.module.css";

const SERVICE_START_YEAR = 2026;

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getToday() {
  return new Date();
}

function getWeekStartDate(value) {
  const date = value ? new Date(`${value}T00:00:00`) : getToday();
  const day = date.getDay();

  date.setDate(date.getDate() - ((day + 6) % 7));
  date.setHours(0, 0, 0, 0);

  return date;
}

function buildRange(period, year, selectedDate, selectedWeekStartDate) {
  if (period === "week") {
    const start = getWeekStartDate(selectedWeekStartDate);
    const end = new Date(start);

    end.setDate(start.getDate() + 6);

    return {
      startDate: formatDateInputValue(start),
      endDate: formatDateInputValue(end),
    };
  }

  if (period === "month") {
    /*
     * 월 탭 정책은 신고 및 제재 관리의 신고 통계와 동일하게 맞춥니다.
     * 특정 월 하나를 조회하지 않고, 선택한 연도의 1월 1일부터 12월 31일까지를 조회합니다.
     * 이렇게 해야 월별 차트가 1월~12월 전체 흐름을 같은 기준으로 보여줍니다.
     */
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    return {
      startDate: formatDateInputValue(start),
      endDate: formatDateInputValue(end),
    };
  }

  return {
    startDate: selectedDate,
    endDate: selectedDate,
  };
}

function getInitialState() {
  const today = getToday();
  const year = Math.max(SERVICE_START_YEAR, today.getFullYear());
  const selectedDate = formatDateInputValue(today);
  const selectedWeekStartDate = formatDateInputValue(getWeekStartDate(selectedDate));

  return {
    year,
    selectedDate,
    selectedWeekStartDate,
  };
}

export function AdminPeriodRangeControl({ period, onRangeChange }) {
  const [rangeState, setRangeState] = useState(() => getInitialState());
  const currentYear = getToday().getFullYear();
  const years = useMemo(
    () =>
      Array.from(
        { length: Math.max(currentYear - SERVICE_START_YEAR + 1, 1) },
        (_, index) => SERVICE_START_YEAR + index,
      ),
    [currentYear],
  );

  const emitRange = (nextState) => {
    const range = buildRange(
      period,
      nextState.year,
      nextState.selectedDate,
      nextState.selectedWeekStartDate,
    );

    onRangeChange(range);
  };

  const resetRange = () => {
    const nextState = getInitialState();

    setRangeState(nextState);
    emitRange(nextState);
  };

  useEffect(() => {
    resetRange();
  }, [period]);

  const updateRangeState = (patch) => {
    setRangeState((prevState) => {
      const nextState = { ...prevState, ...patch };

      emitRange(nextState);

      return nextState;
    });
  };

  const updateYear = (nextYear) => {
    if (period === "day") {
      updateRangeState({
        year: nextYear,
        selectedDate: `${nextYear}-01-01`,
      });
      return;
    }

    if (period === "week") {
      updateRangeState({
        year: nextYear,
        selectedWeekStartDate: `${nextYear}-01-01`,
      });
      return;
    }

    updateRangeState({ year: nextYear });
  };

  return (
    <div className={styles.rangeControl}>
      <label>
        <span>연도</span>
        <select
          value={rangeState.year}
          onChange={(event) =>
            updateYear(Number(event.target.value))
          }
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>
      </label>

      {period === "day" ? (
        <label>
          <span>날짜</span>
          <input
            type="date"
            min={`${SERVICE_START_YEAR}-01-01`}
            max={`${currentYear}-12-31`}
            value={rangeState.selectedDate}
            onChange={(event) =>
              updateRangeState({
                selectedDate: event.target.value,
                year: Number(event.target.value.slice(0, 4)),
              })
            }
          />
        </label>
      ) : null}

      {period === "week" ? (
        <label>
          <span>주 시작일</span>
          <input
            type="date"
            min={`${SERVICE_START_YEAR}-01-01`}
            max={`${currentYear}-12-31`}
            value={rangeState.selectedWeekStartDate}
            onChange={(event) =>
              updateRangeState({
                selectedWeekStartDate: event.target.value,
                year: Number(event.target.value.slice(0, 4)),
              })
            }
          />
        </label>
      ) : null}

      <button type="button" onClick={resetRange}>
        초기화
      </button>
    </div>
  );
}
