
import { useMemo } from 'react';
import { generateCalendarData } from '@/data/mockData';

interface CalendarData {
  [key: string]: { type: 'work' | 'leave' | 'tour', intensity: number };
}

export const ContributionCalendar = () => {
  const calendarData = useMemo(() => generateCalendarData(), []);
  
  const getWeeksArray = () => {
    const weeks = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 182); // ~6 months
    
    let currentDate = new Date(startDate);
    // Adjust to start on Sunday
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let week = 0; week < 26; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        weekData.push({
          date: dateStr,
          data: calendarData[dateStr] || null
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(weekData);
    }
    
    return weeks;
  };

  const weeks = getWeeksArray();

  const getCellColor = (data: { type: 'work' | 'leave' | 'tour', intensity: number } | null) => {
    if (!data) return 'bg-gray-100 dark:bg-gray-800';
    
    switch (data.type) {
      case 'work':
        const workIntensity = ['bg-green-100', 'bg-green-200', 'bg-green-400', 'bg-green-600'];
        return `${workIntensity[data.intensity - 1]} dark:bg-green-${data.intensity * 200}`;
      case 'leave':
        return 'bg-yellow-400 dark:bg-yellow-600';
      case 'tour':
        return 'bg-blue-400 dark:bg-blue-600';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getTooltipText = (date: string, data: { type: 'work' | 'leave' | 'tour', intensity: number } | null) => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    if (!data) return `${formattedDate}: No activity`;
    
    switch (data.type) {
      case 'work':
        return `${formattedDate}: Work day (${data.intensity * 2} hours)`;
      case 'leave':
        return `${formattedDate}: On leave`;
      case 'tour':
        return `${formattedDate}: Business tour`;
      default:
        return formattedDate;
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Overview</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <span>Work</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>
            <span>Leave</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
            <span>Tour</span>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col space-y-1">
          <div className="flex space-x-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <div className="w-3"></div>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => (
              <div key={month} className="w-16 text-center">{month}</div>
            ))}
          </div>
          
          <div className="flex space-x-1">
            <div className="flex flex-col space-y-1 text-xs text-gray-500 dark:text-gray-400 w-3">
              {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((day, index) => (
                <div key={index} className="h-3 flex items-center justify-center">
                  {day}
                </div>
              ))}
            </div>
            
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col space-y-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-3 h-3 rounded-sm border border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:scale-110 ${getCellColor(day.data)}`}
                    title={getTooltipText(day.date, day.data)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
