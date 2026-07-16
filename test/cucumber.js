module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['test/features/step_definitions/**/*.ts'],
    format: ['progress'],
    paths: ['test/features/**/*.feature']
  }
}
