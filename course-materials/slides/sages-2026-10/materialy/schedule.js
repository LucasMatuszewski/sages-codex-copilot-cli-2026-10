/* One course schedule source for every topic deck and the participant agenda.
   Both groups share these materials; dates are confirmed by the trainer.
   The trainer confirmed these break times; reminders are active on each course date. */
(() => {
  const common = {
    courseId:'sages-sygnity-2026-10',
    timeZone:'Europe/Warsaw',
    start:'09:00', end:'17:00',
    breaks:[
      {time:'11:00', duration:10, label:'Przerwa poranna', confirmed:true},
      {time:'13:00', duration:40, label:'Przerwa obiadowa', confirmed:true},
      {time:'15:00', duration:10, label:'Przerwa popołudniowa', confirmed:true}
    ]
  };
  // Each group has four days; the shared decks follow today's matching date.
  const groups = [
    ['2026-10-05','2026-10-06','2026-10-07','2026-10-08'],
    ['2026-10-13','2026-10-14','2026-10-15','2026-10-16']
  ];
  window.COURSE_DAYS = groups.flatMap(dates => dates.map((date, index) => ({
    ...common, day:index + 1, date, breaks:common.breaks.map(item => ({...item}))
  })));
  // A topic deck is shown on whichever day its topic comes up, so it follows the course day
  // whose date is today. Outside the course dates it shows the hours of the first day.
  let today = null;
  try {
    today = new Intl.DateTimeFormat('en-CA',{timeZone:common.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  } catch (_) {}
  window.COURSE_SCHEDULE = window.COURSE_DAYS.find(day => day.date && day.date === today) || window.COURSE_DAYS[0];
})();
