module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['test/regression/features/step_definitions/**/*.ts'],
    format: ['progress'],
    paths: ['test/regression/features/**/*.feature']
  }
}
