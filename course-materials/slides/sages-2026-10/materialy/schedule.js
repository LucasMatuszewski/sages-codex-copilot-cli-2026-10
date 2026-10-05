/* One course schedule source for every topic deck and the participant agenda.
   Set the date of each course day in `dates` before delivery; null keeps preview alarms quiet. */
(() => {
  const common = {
    courseId:'sages-sygnity-2026-10',
    timeZone:'Europe/Warsaw',
    start:'09:00', end:'17:00',
    breaks:[
      {time:'10:45', duration:10, label:'Przerwa poranna (propozycja)'},
      {time:'12:30', duration:40, label:'Przerwa obiadowa (propozycja)'},
      {time:'14:45', duration:10, label:'Przerwa popołudniowa (propozycja)', optional:true}
    ]
  };
  // One date per course day, by day number; a day without a date raises no break reminders.
  const dates = {1:'2026-10-05',2:'2026-10-06',3:'2026-10-07',4:'2026-10-08'};
  window.COURSE_DAYS = [1,2,3,4].map(day => ({
    ...common, day, date:dates[day], breaks:common.breaks.map(item => ({...item}))
  }));
  // A topic deck is shown on whichever day its topic comes up, so it follows the course day
  // whose date is today. Outside the course dates it shows the hours of the first day.
  let today = null;
  try {
    today = new Intl.DateTimeFormat('en-CA',{timeZone:common.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  } catch (_) {}
  window.COURSE_SCHEDULE = window.COURSE_DAYS.find(day => day.date && day.date === today) || window.COURSE_DAYS[0];
})();
