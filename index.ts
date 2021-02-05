import main from './src/main';

if (require.main === module) {
  main().then(() => { console.log("Exiting"); });
}
