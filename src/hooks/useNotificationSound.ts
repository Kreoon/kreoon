import { useCallback, useRef, useEffect } from 'react';

// Base64 encoded simple notification sounds (works in background)
const NOTIFICATION_SOUNDS = {
  chat: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleB0AJoz/+t/FfzQANJ3/+93Af0AALYT/+eLHhjYAKXr/+OfPjTgAJHH/+e/XlDoAIGj/+vbfoTwAHGD/+/vnqD4AGVn//v/wsUAAFlP//v/2u0IAE07//f/8xEQAEkr//P/+zEYAEEf//P/+00gAD0X//P/+2EoADkT//P/+3EwADUP//f/+30wADUP//f//4E0ADUP//f//4E0ADUP//f//4E0ADUP//f//4E0ADUP//f//30wADUP//f/+3UwADkT//P/+2UoAD0X//P/+1UgAEEf//P/+0EYAEU3//f/9yEMAE07//v/8wkAAFVL//v/5vD4AF1j//v/1tTwAGl///f/wrjkAHmf/+//oqDYAI3L/+vvfnzQAKX7/+PTUlzIAMIz/+O3JjjAAOJ3/+eW+hC4ARK//+ty0ey4AVML/+dKodyoAadn/98WicScAf/D/9biXZCMAl/n/9KqNYSEAr/3/85+EXyAAwv7/8pV7XR8A0/7/8Yt0Wx4A4v7/8IF0Wh0A7v7/74BwWBsA+P7/7n5sVhoAAf//7nxpVBkACf//7XplUhgAEP//7HhiUBcAFv//63VfThYAG///6nJcTBUAIf//6W9ZTBUAJP//6GxWShQAKP//52lTSBMAK///5mZQRhIALv//5WNNRBEAMf//5F9KQhAANP//41xHQA8ANv//4llEPg4AOv//4VZBPAwAO///4FM+OgsAPv//31A7OAoAQP//3k04NgkAQv//3Uo1NAkARP//3Ec0MggARv//20QxMAgASP//2kEvLgcASf//2T4tLAcAS///2DsqKgYATP//1zgpKAYATv//1jUnJgUAT///1TIlJAUA',
  notification: 'data:audio/wav;base64,UklGRpQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YXAGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2OyleR4AI4n/+d3Df0UALYL/+ODBfjoALHr/9+G/ejoAK3L/9uO9djsAKmr/9ea7cjsAKWP/9ei5bjwAKFz/9eq2ajwAJ1b/9ey0ZjwAJlD/9u6yYjwAJUv/9/CwXjwAJEf/9/KuWjwAI0P/+PSsVjwAIkD/+PatUjsAIT7/+firTjsAIDz/+fmpSjsAHzr/+fuoRjoAHjn/+v2mQjkAHTj/+v+kPjkAHDb/+wGjOzgAGzb/+wOhODgAGzX/+wSgNTgAGjT/+waeMzgAGjP/+wecMTcAGTL/+widLzcAGTH/+gqbLTYAGDD/+gqZKzYAFy//+gyYKTYAFy//+g2WJzYAFi7/+g+UJTYAFi3/+hCSIzYAFSz/+hKRITYAFSz/+hOPHzYAFCv/+hSNHTUAFCr/+haMGzUAFCr/+hiKGTUAEyn/+hmJFzUAEyj/+hqHFTQAEij/+huFFDQAEif/+hyDEjQAESf/+h2BEDQAES//+R9+DTMAEjL/+CF8CzIAEjX/+CN6CTIAEjj/9yV4BzEAEzv/9yd2BjEAEz7/9yh0BDEAE0H/9ip0AjAAE0T/9it0ADAAFEL/8y12/C8AE0T/8S94+i8AE0b/8DF5+C4AE0j/8DJ79i4AEkj/7TR99C0AEkj/7DZ+8i0AEkj/6zh/8CwAEkf/6jmA7iwAEkf/6TuC7CwAEkb/6T2D6isAEUX/6D+E6CsAEUX/50GF5ioAEUT/5kKG5CoAEEP/5UOH4ikAEEP/5ESI4CkAD0L/40WJ3igAD0H/4kaK3CgAD0D/4UiL2icADj//4EmL2CcADj7/30uM1iYADT3/3kyN1CYADTz/3U2N0iYADDv/3E+O0CUADDD/2lCPziQADC3/2VKQzCQADCr/2FOQyiQADCf/11SRyCMADB//1laSwSMADB3/1VeSvyIADRr/1FiTvSIADRf/01mTuyIADRT/0lqTuSEADRH/0VuUtyEADQ7/0FyUtSAADQv/z12VsyAADQj/zl+VsSAADQX/zWCWryAADQL/zGGWrR8ADf/+y2KXqx8ADP3+ymOXqR8ADPr+yWWXpx4ADPf+yGaYpR4ADPT+x2eYox4AO/H+xmmZoR0AO+7+xWqZnx0AO+v+xGuanR0AOuj+w22anBwAOuX+wm6bmhwAOuL+wW+blhwAOt/+wHGclBsAOtz+v3KclBsAOtr+vnOdkhsAOtf+vXSdkBoAOtT+vHadkBoAOdH+u3eejxkAOc/+uniejRkAOcz+uXqejBkAOcn+uHufihkAOcb+t3yfiBkAOcP+tn2fiRgAOMH+tX6fiRgAOL7+tH+giRgAOLv+s4CgiRgAN7n+soGgiRcAN7b+sYKhiRcAN7P+sIOhiRcAN7D+r4ShiRcANq3+roWiiRcANqr+rYaiiRcANqj+rIejiRcANqX+q4ijiRcANaL+qomiihYANZ/+qYqkihYANZz+qIukihYANZn+p4ykihYANpf+powlihUANpT+pY0lihUANpH+pI4lihQANY3+o48mig==',
  urgent: 'data:audio/wav;base64,UklGRsAGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZwGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2+yqfBwAH4L/+tzDgEQAL4r/+trCf0MAL4r/+NjAgEIAMIr/+NbBgEEAMIn/+NTCgT8AMYX/99LDgjsAMoH/9tHFgzgAMn3/9c/Hgy4AMXr/9MzJhCkAMHf/9MnLhCUAMHT/88bNhCAAL3H/88TOhBsAL27/8sPRhBYALmr/8sHTgxAALmf/8r7VgwoALWT/8rzXgwUALWH/8rrZggAALF//8rjaggAALF3/8rbcgP8ALFv/8rTdgP0ALFn/8rPfgPsAK1f/8rHhgPkAK1X/8bDjgPYAK1P/8a7lgPQAKlH/8azngPIAKk//8avpgPAAKk3/8anrgO4AKkv/8aftgOwAKUn/8ab/gOoAKUf/8aT/gOgAKUX/8aP/gOYAKEP/8aL/gOQAKEH/8aH/gOMAKD//8aD/gOIAKD3/8Z//gOEAKDv/8J7/gOAAJzn/8J7/gN8AJzf/8J3/gN4AJzX/8J3/gN0AJjP/8Jz/gNwAJjH/8Jv/gNsAJi//8Jv/gNoAJS3/8Jr/gNkAJSv/8Jn/gNkAJSn/8Jn/gNkAJSf/8Jj/gNgAJCX/8Jj/gNcAJCP/8Jf/gNYAJCH/8Jf/gNUAIx//8Jb/gNQAIx3/8JX/gNMAIhv/8JT/gNIAIhn/8JT/gNEAIhf/8JP/gNAAIRX/8JL/gM8AIhP/8JH/gM4AHxH/8JH/gM0AHw//8JD/gMwAHw3/8I//gMsAHgv/8I7/gMoAHgn/8I3/gMkAHQf/8I3/gMgAHQX/8Iz/gMcAHAP/8Iv/gMYAHAH/8Ir/gMUAG///74n/gMQAGv3/74j/gMMAAP3/7Yf/gMIAAP3/64f/gMEAAP3/6Yb/gMAAAP3/54X/gL8AAP7/5YX/gL4AAP7/44T/gL0AAP//4YP/gLwAAP//34L/gLsAAP//3YL/gLoAAP//24H/gLkAAP//2YD/gLgAAP//13//gLcAAP//1X7/gLYAAP//033/gLUAAP//0Xz/gLQAAP//z3v/gLMAAP//zXr/gLIAAP//y3n/gLEAAP//yXj/gLAAAP//x3f/gK8AAP//xXb/gK4AAP//w3X/gK0AAP//wXT/gKwAAP//v3P/gKsAAP//vXL/gKoAAP//u3H/gKkAAP//uXD/gKgAAP//t2//gKcAAP//tW7/gKYAAP//s27/gKYAAP//sW3/gKYAAP//r2z/gKYAAP//rWv/gKYAAP//q2r/gKYAAP//qWn/gKYAAP//p2j/gKYAAP//pWf/gKYAAP//o2f/gKYAAP//oWb/gKYAAP//n2X/gKYAAP//nWT/gKYAAP//m2P/gKYAAP//mWL/gKYAAP//l2H/gKYAAP//lWD/gKYAAP//k1//gKYAAP//kV7/gKYAAP//j13/gKYAAP//jVz/gKYAAP//i1v/gKYAAP//iVr/gKYAAP//h1n/gKYAAP//hVj/gKYAAP//g1f/gKYAAP//gVb/gKYAAP//f1X/gKYAAP//fVT/gKYAAP//e1P/gKYAAP//eVL/gKYAAP//d1H/gKYAAP//dVD/gKYAAP//c0//gKYAAP//cU7/gKYAAP//b03/gKYAAP//bUz/gKYAAP//a0v/gKYAAP//aUr/gKYAAP//Z0n/gKYAAP//ZUj/gKYAAP//Y0f/gKYAAP//YUb/gKYAAP//X0X/gKYAAP//XUT/gKYAAP//W0P/gKYAAP//WUL/gKYAAP//V0H/gKYAAP//VUD/gKY=',
};

// Pre-loaded audio elements for background playback
let audioElements: Record<string, HTMLAudioElement> = {};

// Initialize audio elements
const initAudio = () => {
  if (Object.keys(audioElements).length === 0) {
    Object.entries(NOTIFICATION_SOUNDS).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = key === 'chat' ? 0.5 : key === 'notification' ? 0.6 : 0.7;
      audioElements[key] = audio;
    });
  }
};

// Play sound using HTML5 Audio (works in background tabs)
const playNotificationAudio = async (type: 'chat' | 'notification' | 'urgent') => {
  initAudio();
  
  const audio = audioElements[type];
  if (!audio) return;
  
  try {
    // Reset to beginning if already playing
    audio.currentTime = 0;
    
    // Clone the audio for overlapping sounds
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = audio.volume;
    
    await clone.play();
    
    // Vibrate on mobile if available
    if ('vibrate' in navigator) {
      const vibrationPattern: Record<string, number[]> = {
        chat: [100, 50, 100],
        notification: [150, 50, 150],
        urgent: [200, 100, 200, 100, 200],
      };
      navigator.vibrate(vibrationPattern[type]);
    }
  } catch (error) {
    console.warn('Could not play notification sound:', error);
    // Try vibration as fallback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }
};

export function useNotificationSound() {
  const lastPlayedRef = useRef<number>(0);
  const minInterval = 800; // Minimum 0.8 second between sounds

  // Pre-load audio on mount
  useEffect(() => {
    initAudio();
  }, []);

  const playSound = useCallback((type: 'chat' | 'notification' | 'urgent' = 'notification') => {
    const now = Date.now();
    
    // Throttle sound playback
    if (now - lastPlayedRef.current < minInterval) {
      return;
    }
    
    lastPlayedRef.current = now;
    playNotificationAudio(type);
  }, []);

  const playChatSound = useCallback(() => playSound('chat'), [playSound]);
  const playNotificationSound = useCallback(() => playSound('notification'), [playSound]);
  const playUrgentSound = useCallback(() => playSound('urgent'), [playSound]);

  return {
    playSound,
    playChatSound,
    playNotificationSound,
    playUrgentSound,
  };
}