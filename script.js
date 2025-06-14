const section = document.querySelector('.section');
const route = document.querySelector('input');
const buttons  = document.querySelectorAll('.nav-el')
const templates = document.querySelectorAll('.section-templates [data-section]');
const templateMap = {};

templates.forEach(t => {
  templateMap[t.dataset.section] = t.innerHTML;
});

   buttons.forEach(button => {

    button.addEventListener('click', () => {
      // 1. Clear `.b11` from all buttons
      buttons.forEach(btn => btn.classList.remove('b1'));
    
      // 2. Add `.b11` only to the clicked button
      button.classList.add('b1');
    
      // 3. Update the placeholder and section
      route.placeholder = button.innerText.trim();
      changeSection();
    });
    
    button.addEventListener('mouseenter', () => button.classList.add('b11'));
    button.addEventListener('mouseleave', () => button.classList.remove('b11'));

   });


function changeSection() {

 
  switch (route.placeholder) {
    case 'home':
      section.innerHTML = templateMap['home'];
      break;
    case 'academics':
      section.innerHTML = templateMap['academics'];
      break;
    case 'research':
      section.innerHTML = templateMap['research'];
      break;
    case 'resources':
        section.innerHTML = templateMap['resources'];
        break;
    case 'contact':
        section.innerHTML = templateMap['contact'];
        break;
    default:
      section.innerHTML = '<h1>Welcome to the default route</h1>';
      break;
  }

}
   
const daysLeft = document.querySelector('p.daysLeft');
// a no of days left timer to 30 Dec 2025 and setting the value of daysLeft to it
const targetDate = new Date('December 30, 2025');
const updateDaysLeft = () => {
  const currentDate = new Date();
  const timeDifference = targetDate - currentDate;
  const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
  daysLeft.textContent = `Days left: ${daysRemaining}`;
};

// Update the timer immediately and set an interval to update it daily
updateDaysLeft();
setInterval(updateDaysLeft, 24 * 60 * 60 * 1000);



  